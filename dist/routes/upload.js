"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer = require('multer');
// import { NextRequest, NextResponse } from 'next
const { uploadToS3, uploadMultipleToS3, deleteFromS3, getPresignedUrl } = require('../lib/awsS3Connect');
const router = express_1.default.Router();
// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and PDFs
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
    },
});
// Upload single file
router.post('/upload-single', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Determine folder based on file type
        let folder = 'others';
        if (req.file.mimetype.startsWith('image/')) {
            folder = 'images';
        }
        else if (req.file.mimetype === 'application/pdf') {
            folder = 'pdfs';
        }
        const result = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, folder);
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            file: result,
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});
// Upload multiple files
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const filesArray = req.files;
        const filesData = filesArray.map(file => {
            let folder = 'others';
            if (file.mimetype.startsWith('image/')) {
                folder = 'images';
            }
            else if (file.mimetype === 'application/pdf') {
                folder = 'pdfs';
            }
            return {
                buffer: file.buffer,
                filename: file.originalname,
                mimetype: file.mimetype,
                folder,
            };
        });
        const uploadResults = await Promise.all(filesData.map((file) => uploadToS3(file.buffer, file.filename, file.mimetype, file.folder)));
        res.status(200).json({
            success: true,
            message: `${uploadResults.length} files uploaded successfully`,
            files: uploadResults,
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});
// Get presigned URL for file access
router.get(/^\/presigned-url\/(.+)/, async (req, res) => {
    try {
        const key = req.params[0];
        const expiresIn = parseInt(typeof req.query.expiresIn === 'string' ? req.query.expiresIn : '3600'); // Default 1 hour
        const url = await getPresignedUrl(key, expiresIn);
        res.status(200).json({
            success: true,
            url,
            expiresIn,
        });
    }
    catch (error) {
        console.error('Presigned URL error:', error);
        res.status(500).json({
            error: 'Failed to generate URL',
            message: error.message
        });
    }
});
// Delete file from S3
router.delete(/^\/delete\/(.+)/, async (req, res) => {
    try {
        const key = req.params[0];
        const result = await deleteFromS3(key);
        res.status(200).json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: 'Delete failed',
            message: error.message
        });
    }
});
// Error handling middleware
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const code = error.code;
        if (code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'File size should not exceed 50MB',
            });
        }
        if (code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files',
                message: 'Maximum 10 files allowed',
            });
        }
    }
    res.status(500).json({
        error: 'Server error',
        message: error.message,
    });
});
module.exports = router;
