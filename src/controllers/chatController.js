const { validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const JobApplication = require('../models/JobApplication');

/**
 * Chat Controller - Real-time Firebase Chat Management
 * Handles all chat operations for job communications
 */
class ChatController {
  /**
   * Get user's chat list
   * GET /api/chats
   */
  static async getUserChats(req, res) {
    try {
      const { userId, userType } = req.user; // From auth middleware
      
      console.log(`🔍 Getting chats for user: ${userId}, type: ${userType}`);

      // Get the actual seeker/company ID for this user
      let actualUserId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualUserId = seeker.id;
          console.log(`🔄 Found seeker ID: ${actualUserId} for user: ${userId}`);
        } else {
          console.warn(`⚠️ No seeker found for user: ${userId}`);
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualUserId = company.id;
          console.log(`🔄 Found company ID: ${actualUserId} for user: ${userId}`);
        } else {
          console.warn(`⚠️ No company found for user: ${userId}`);
        }
      }
      
      const chats = await Chat.findByUserId(actualUserId, userType);
      console.log(`📨 Found ${chats.length} chats for ${userType} ID: ${actualUserId}`);
      
      // Disable caching for dynamic data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.status(200).json({
        success: true,
        message: 'Chats retrieved successfully',
        data: chats.map(chat => chat.toJSON())
      });

    } catch (error) {
      console.error('Error getting user chats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get specific chat details
   * GET /api/chats/:chatId
   */
  static async getChatById(req, res) {
    try {
      const { chatId } = req.params;
      const { userId, userType } = req.user;
      
      console.log(`🔍 Getting chat ${chatId} for user: ${userId}, type: ${userType}`);

      // Get the actual seeker/company ID for this user
      let actualUserId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualUserId = seeker.id;
          console.log(`🔄 Found seeker ID: ${actualUserId} for user: ${userId}`);
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualUserId = company.id;
          console.log(`🔄 Found company ID: ${actualUserId} for user: ${userId}`);
        }
      }
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      console.log(`🔒 Checking access: user=${actualUserId}, chat.companyId=${chat.companyId}, chat.seekerId=${chat.seekerId}`);

      // Verify user has access to this chat using the mapped ID
      const hasAccess = (userType === 'company' && chat.companyId === actualUserId) ||
                       (userType === 'seeker' && chat.seekerId === actualUserId);
      
      if (!hasAccess) {
        console.log(`❌ Access denied: ${userType} ${actualUserId} cannot access chat with companyId=${chat.companyId}, seekerId=${chat.seekerId}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      console.log(`✅ Access granted for ${userType} ${actualUserId}`);

      // Mark messages as read using the mapped ID
      await Chat.markAsRead(chatId, actualUserId, userType);
      
      res.status(200).json({
        success: true,
        message: 'Chat retrieved successfully',
        data: chat.toJSON()
      });

    } catch (error) {
      console.error('Error getting chat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chat',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get chat messages
   * GET /api/chats/:chatId/messages
   */
  static async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const { userId, userType } = req.user;
      const { limit = 50, lastTimestamp } = req.query;
      
      console.log(`💬 Getting messages for chat ${chatId}, user: ${userId}, type: ${userType}`);

      // Get the actual seeker/company ID for this user
      let actualUserId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualUserId = seeker.id;
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualUserId = company.id;
        }
      }
      
      // Verify user has access to this chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Use the mapped ID for authorization check
      const hasAccess = (userType === 'company' && chat.companyId === actualUserId) ||
                       (userType === 'seeker' && chat.seekerId === actualUserId);
      
      if (!hasAccess) {
        console.log(`❌ Message access denied: ${userType} ${actualUserId} cannot access chat with companyId=${chat.companyId}, seekerId=${chat.seekerId}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      console.log(`✅ Message access granted for ${userType} ${actualUserId}`);

      const messages = await Chat.getMessages(chatId, parseInt(limit), lastTimestamp);
      
      // Disable caching for dynamic data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data: messages
      });

    } catch (error) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve messages',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Send a message
   * POST /api/chats/:chatId/messages
   */
  static async sendMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { chatId } = req.params;
      const { userId, userType } = req.user;
      const { messageText, messageType = 'text' } = req.body;
      
      console.log(`📤 Sending message to chat ${chatId}, user: ${userId}, type: ${userType}`);

      // Get the actual seeker/company ID for this user
      let actualUserId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualUserId = seeker.id;
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualUserId = company.id;
        }
      }
      
      // Verify user has access to this chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Use the mapped ID for authorization check
      const hasAccess = (userType === 'company' && chat.companyId === actualUserId) ||
                       (userType === 'seeker' && chat.seekerId === actualUserId);
      
      if (!hasAccess) {
        console.log(`❌ Send message access denied: ${userType} ${actualUserId} cannot access chat with companyId=${chat.companyId}, seekerId=${chat.seekerId}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      // Check if chat is active
      if (chat.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Cannot send message to inactive chat'
        });
      }

      console.log(`✅ Sending message from ${userType} ${actualUserId}`);

      // Use the mapped ID for sending the message
      const message = await Chat.sendMessage(chatId, actualUserId, userType, messageText, messageType);
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark messages as read
   * PUT /api/chats/:chatId/read
   */
  static async markAsRead(req, res) {
    try {
      const { chatId } = req.params;
      const { userId, userType } = req.user;
      
      // Get the actual seeker/company ID for this user
      let actualUserId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualUserId = seeker.id;
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualUserId = company.id;
        }
      }
      
      // Verify user has access to this chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Use the mapped ID for authorization check
      const hasAccess = (userType === 'company' && chat.companyId === actualUserId) ||
                       (userType === 'seeker' && chat.seekerId === actualUserId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      // Use the mapped ID for marking as read
      await Chat.markAsRead(chatId, actualUserId, userType);
      
      res.status(200).json({
        success: true,
        message: 'Messages marked as read'
      });

    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Archive chat
   * PUT /api/chats/:chatId/archive
   */
  static async archiveChat(req, res) {
    try {
      const { chatId } = req.params;
      const { userId, userType } = req.user;
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Verify user has access to this chat
      const hasAccess = (userType === 'company' && chat.companyId === userId) ||
                       (userType === 'seeker' && chat.seekerId === userId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      await chat.archive();
      
      res.status(200).json({
        success: true,
        message: 'Chat archived successfully',
        data: chat.toJSON()
      });

    } catch (error) {
      console.error('Error archiving chat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive chat',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Block chat
   * PUT /api/chats/:chatId/block
   */
  static async blockChat(req, res) {
    try {
      const { chatId } = req.params;
      const { userId, userType } = req.user;
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Verify user has access to this chat
      const hasAccess = (userType === 'company' && chat.companyId === userId) ||
                       (userType === 'seeker' && chat.seekerId === userId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      await chat.block();
      
      res.status(200).json({
        success: true,
        message: 'Chat blocked successfully',
        data: chat.toJSON()
      });

    } catch (error) {
      console.error('Error blocking chat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to block chat',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete chat
   * DELETE /api/chats/:chatId
   */
  static async deleteChat(req, res) {
    try {
      const { chatId } = req.params;
      const { userId, userType } = req.user;
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Verify user has access to this chat
      const hasAccess = (userType === 'company' && chat.companyId === userId) ||
                       (userType === 'seeker' && chat.seekerId === userId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      await chat.delete();
      
      res.status(200).json({
        success: true,
        message: 'Chat deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete chat',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Create chat manually (for testing)
   * POST /api/chats/create
   */
  static async createChat(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId, seekerId, jobId, jobTitle } = req.body;
      
      const chat = await Chat.create(companyId, seekerId, jobId, jobTitle);
      
      res.status(201).json({
        success: true,
        message: 'Chat created successfully',
        data: chat.toJSON()
      });

    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create chat',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ChatController;