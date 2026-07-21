import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import {
  handleUploadSession,
  handleAnalyseSession,
  handleInterpretComparison,
  handleGetZonePromptTemplate,
  handleGetLapPromptTemplate,
  handleGetUserPrompts,
  handleSaveUserPrompt,
  handleInterpretZone,
} from '../services/uploadService';
import {
  handleListZoneMaps,
  handleCreateZoneMap,
  handleDeleteZoneMap,
} from '../services/zoneMapService';
import {
  requireAnalysis,
  requireUploadCredit,
} from '../middleware/requireEntitlement';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// No practical cap on the number of files per upload; guard only against a
// single runaway file. A high maxCount stands in for "unlimited".
const upload = multer({ storage, limits: { fileSize: 60 * 1024 * 1024 } });

const receiveUploads = upload.fields([
  { name: 'files', maxCount: 1000 },
  { name: 'file', maxCount: 1 },
]);

/**
 * Runs multer, then turns any multer error into a clean 400 JSON response.
 * Without this the error falls through to Express's default HTML error handler
 * — and because it fires mid-stream while the browser is still sending the body,
 * the upload appears to *hang* in the browser rather than failing cleanly.
 */
function handleUploadFiles(req: Request, res: Response, next: NextFunction) {
  receiveUploads(req, res, (err: unknown) => {
    if (!err) return next();
    const message =
      err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE'
          ? 'One of your files is too large (60 MB max per file).'
          : `Upload error: ${err.message}`
        : err instanceof Error
        ? err.message
        : 'Upload failed.';
    return res.status(400).json({ error: message });
  });
}

router.get('/upload-session', (_req, res) => {
  res.json({ message: 'upload route alive' });
});

// Accept one or many telemetry files in one upload (multi-session). The legacy
// single-file field name "file" is still honoured by the handler.
// Loading a dataset consumes a credit — check entitlement before multer saves
// the files.
router.post(
  '/upload-session',
  requireUploadCredit,
  handleUploadFiles,
  handleUploadSession,
);

router.post('/analyse-session', requireAnalysis, handleAnalyseSession);

router.post('/interpret-comparison', requireAnalysis, handleInterpretComparison);

router.get('/zone-prompt-template', handleGetZonePromptTemplate);
router.get('/lap-prompt-template', handleGetLapPromptTemplate);
router.post('/interpret-zone', requireAnalysis, handleInterpretZone);

// Per-account prompt customisations (persist across devices).
router.get('/user-prompts', handleGetUserPrompts);
router.put('/user-prompts', handleSaveUserPrompt);

router.get('/zone-maps', handleListZoneMaps);
router.post('/zone-maps', handleCreateZoneMap);
router.delete('/zone-maps/:id', handleDeleteZoneMap);

export default router;