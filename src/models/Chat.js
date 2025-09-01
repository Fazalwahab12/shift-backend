const firebaseConfig = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

/**
 * Chat Model - Real-time Firebase Chat System
 * Handles chat rooms and messages between companies and job seekers
 */
class Chat {
  constructor(data = {}) {
    this.id = data.id || null;
    this.chatId = data.chatId || this.generateChatId();
    
    // Participants
    this.companyId = data.companyId || null;
    this.seekerId = data.seekerId || null;
    this.jobId = data.jobId || null;
    
    // Chat metadata
    this.status = data.status || 'active'; // 'active', 'archived', 'blocked'
    this.type = data.type || 'job_chat'; // 'job_chat', 'interview_chat', 'support_chat'
    
    // Participant details (cached for quick access)
    this.companyName = data.companyName || null;
    this.seekerName = data.seekerName || null;
    this.jobTitle = data.jobTitle || null;
    
    // Chat settings
    this.lastMessage = data.lastMessage || null;
    this.lastMessageTimestamp = data.lastMessageTimestamp || null;
    this.unreadCount = data.unreadCount || { company: 0, seeker: 0 };
    
    // System fields
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  /**
   * Generate unique chat ID
   */
  generateChatId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `chat_${timestamp}_${random}`;
  }

  /**
   * Create a new chat room in Firestore
   */
  static async create(companyId, seekerId, jobId, jobTitle) {
    try {
      const db = firebaseConfig.getDb();
      
      // Check if chat already exists for this job application
      const existingChat = await db.collection('chats')
        .where('companyId', '==', companyId)
        .where('seekerId', '==', seekerId)
        .where('jobId', '==', jobId)
        .limit(1)
        .get();

      if (!existingChat.empty) {
        const chatDoc = existingChat.docs[0];
        return new Chat({ id: chatDoc.id, ...chatDoc.data() });
      }

      const chatData = {
        chatId: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        companyId,
        seekerId,
        jobId,
        jobTitle,
        status: 'active',
        type: 'job_chat',
        lastMessage: null,
        lastMessageTimestamp: null,
        unreadCount: { company: 0, seeker: 0 },
        createdAt: firebaseConfig.getServerTimestamp(),
        updatedAt: firebaseConfig.getServerTimestamp(),
        isActive: true
      };

      const docRef = await db.collection('chats').add(chatData);
      
      // Create initial system message
      await Chat.sendSystemMessage(docRef.id, 'Chat started. You can now communicate about this job opportunity.');
      
      return new Chat({ id: docRef.id, ...chatData });
    } catch (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to create chat room');
    }
  }

  /**
   * Get chat by ID
   */
  static async findById(chatId) {
    try {
      const db = firebaseConfig.getDb();
      const doc = await db.collection('chats').doc(chatId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return new Chat({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error('Error finding chat:', error);
      throw new Error('Failed to find chat');
    }
  }

  /**
   * Get chats for a user (company or seeker)
   */
  static async findByUserId(userId, userType) {
    try {
      const db = firebaseConfig.getDb();
      const field = userType === 'company' ? 'companyId' : 'seekerId';
      
      const snapshot = await db.collection('chats')
        .where(field, '==', userId)
        .where('isActive', '==', true)
        .orderBy('lastMessageTimestamp', 'desc')
        .get();

      const chats = [];
      snapshot.forEach(doc => {
        chats.push(new Chat({ id: doc.id, ...doc.data() }));
      });

      return chats;
    } catch (error) {
      console.error('Error finding user chats:', error);
      throw new Error('Failed to find user chats');
    }
  }

  /**
   * Send a message in the chat
   */
  static async sendMessage(chatId, senderId, senderType, messageText, messageType = 'text') {
    try {
      const db = firebaseConfig.getDb();
      
      const messageData = {
        messageId: uuidv4(),
        chatId,
        senderId,
        senderType, // 'company' | 'seeker' | 'system'
        messageText,
        messageType, // 'text' | 'image' | 'file' | 'system'
        timestamp: firebaseConfig.getServerTimestamp(),
        isRead: false,
        isEdited: false,
        isDeleted: false
      };

      // Add message to subcollection
      await db.collection('chats').doc(chatId)
        .collection('messages').add(messageData);

      // Update chat's last message info
      const otherUserType = senderType === 'company' ? 'seeker' : 'company';
      await db.collection('chats').doc(chatId).update({
        lastMessage: messageText,
        lastMessageTimestamp: firebaseConfig.getServerTimestamp(),
        updatedAt: firebaseConfig.getServerTimestamp(),
        [`unreadCount.${otherUserType}`]: firebaseConfig.increment(1)
      });

      return messageData;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Send system message
   */
  static async sendSystemMessage(chatId, messageText) {
    return await Chat.sendMessage(chatId, 'system', 'system', messageText, 'system');
  }

  /**
   * Get messages for a chat
   */
  static async getMessages(chatId, limit = 50, lastMessageTimestamp = null) {
    try {
      const db = firebaseConfig.getDb();
      let query = db.collection('chats').doc(chatId)
        .collection('messages')
        .where('isDeleted', '==', false)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (lastMessageTimestamp) {
        query = query.startAfter(lastMessageTimestamp);
      }

      const snapshot = await query.get();
      const messages = [];
      
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new Error('Failed to get messages');
    }
  }

  /**
   * Mark messages as read
   */
  static async markAsRead(chatId, userId, userType) {
    try {
      const db = firebaseConfig.getDb();
      const batch = db.batch();

      // Get unread messages
      const unreadMessages = await db.collection('chats').doc(chatId)
        .collection('messages')
        .where('isRead', '==', false)
        .where('senderType', '!=', userType)
        .get();

      // Mark messages as read
      unreadMessages.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });

      // Reset unread count for user
      batch.update(db.collection('chats').doc(chatId), {
        [`unreadCount.${userType}`]: 0
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  /**
   * Archive chat
   */
  async archive() {
    try {
      const db = firebaseConfig.getDb();
      await db.collection('chats').doc(this.id).update({
        status: 'archived',
        updatedAt: firebaseConfig.getServerTimestamp()
      });
      this.status = 'archived';
    } catch (error) {
      console.error('Error archiving chat:', error);
      throw new Error('Failed to archive chat');
    }
  }

  /**
   * Block chat
   */
  async block() {
    try {
      const db = firebaseConfig.getDb();
      await db.collection('chats').doc(this.id).update({
        status: 'blocked',
        updatedAt: firebaseConfig.getServerTimestamp()
      });
      this.status = 'blocked';
    } catch (error) {
      console.error('Error blocking chat:', error);
      throw new Error('Failed to block chat');
    }
  }

  /**
   * Delete chat (soft delete)
   */
  async delete() {
    try {
      const db = firebaseConfig.getDb();
      await db.collection('chats').doc(this.id).update({
        isActive: false,
        updatedAt: firebaseConfig.getServerTimestamp()
      });
      this.isActive = false;
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat');
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      chatId: this.chatId,
      companyId: this.companyId,
      seekerId: this.seekerId,
      jobId: this.jobId,
      status: this.status,
      type: this.type,
      companyName: this.companyName,
      seekerName: this.seekerName,
      jobTitle: this.jobTitle,
      lastMessage: this.lastMessage,
      lastMessageTimestamp: this.lastMessageTimestamp,
      unreadCount: this.unreadCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive
    };
  }
}

module.exports = Chat;