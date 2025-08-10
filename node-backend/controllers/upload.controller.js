// node-backend/controllers/upload.controller.js

export const uploadSingle = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { originalname, mimetype, size, filename, path } = req.file;
        return res.status(201).json({
            message: 'File uploaded successfully',
            file: { originalname, mimetype, size, filename, path },
        });
    } catch (err) {
        console.error('uploadSingle error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const uploadMultiple = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const files = req.files.map(({ originalname, mimetype, size, filename, path }) => ({
            originalname,
            mimetype,
            size,
            filename,
            path,
        }));
        return res.status(201).json({
            message: 'Files uploaded successfully',
            files,
        });
    } catch (err) {
        console.error('uploadMultiple error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
