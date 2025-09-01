const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const ChatController = require('../controllers/chatController');

const router = express.Router();

/**
 * Chat Routes - Firebase Real-time Messaging
 * All routes require authentication
 */

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/chats
 * @desc    Get user's chat list
 * @access  Private
 */
router.get('/', ChatController.getUserChats);

/**
 * @route   POST /api/chats/create
 * @desc    Create a new chat (manual creation for testing)
 * @access  Private
 */
router.post('/create', [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('jobTitle')
    .optional()
    .isString()
    .withMessage('Job title must be a string')
], ChatController.createChat);

/**
 * @route   GET /api/chats/:chatId
 * @desc    Get specific chat details
 * @access  Private
 */
router.get('/:chatId', ChatController.getChatById);

/**
 * @route   GET /api/chats/:chatId/messages
 * @desc    Get chat messages with pagination
 * @access  Private
 */
router.get('/:chatId/messages', ChatController.getChatMessages);

/**
 * @route   POST /api/chats/:chatId/messages
 * @desc    Send a message in the chat
 * @access  Private
 */
router.post('/:chatId/messages', [
  body('messageText')
    .notEmpty()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message text is required and must be between 1-1000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Invalid message type')
], ChatController.sendMessage);

/**
 * @route   PUT /api/chats/:chatId/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.put('/:chatId/read', ChatController.markAsRead);

/**
 * @route   PUT /api/chats/:chatId/archive
 * @desc    Archive chat
 * @access  Private
 */
router.put('/:chatId/archive', ChatController.archiveChat);

/**
 * @route   PUT /api/chats/:chatId/block
 * @desc    Block chat
 * @access  Private
 */
router.put('/:chatId/block', ChatController.blockChat);

/**
 * @route   DELETE /api/chats/:chatId
 * @desc    Delete chat (soft delete)
 * @access  Private
 */
router.delete('/:chatId', ChatController.deleteChat);

module.exports = router;
router.use(authenticateToken);