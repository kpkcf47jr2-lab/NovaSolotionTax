// IMPORTANTE: Este es el archivo COMPLETO actualizado
// Ubicación en NovaSolutionTax: apps/api/src/index.ts
// Instrucción: Reemplaza TODO el contenido de index.ts con este archivo

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createStorageProvider } from '@novasolutiontax/integrations';

// ============================================================================
// TYPES & MIDDLEWARE
// ============================================================================

interface AuthRequest extends Request {
  userId?: string;
  officeId?: string;
  userRole?: string;
}

// Document classification based on filename patterns
function classifyDocument(filename: string): string {
  const lower = filename.toLowerCase();

  if (lower.includes('w2')) return 'W2_2024';
  if (lower.includes('1099-int')) return '1099_INT';
  if (lower.includes('1099-div')) return '1099_DIV';
  if (lower.includes('1099-nec')) return '1099_NEC';
  if (lower.includes('1099-misc')) return '1099_MISC';
  if (lower.includes('1098-t')) return '1098_T';
  if (lower.includes('1098-h')) return '1098_H';
  if (lower.includes('k-1') || lower.includes('schedule k')) return 'SCHEDULE_K1';
  if (lower.includes('broker') || lower.includes('brokerage')) return 'BROKERAGE_STMT';
  if (lower.includes('mortgage') || lower.includes('1098')) return 'MORTGAGE_STMT';
  if (lower.includes('property') || lower.includes('estate')) return 'PROPERTY_TAX';
  if (lower.includes('donation') || lower.includes('charity')) return 'DONATION_RECEIPT';
  if (lower.includes('medical') || lower.includes('insurance')) return 'MEDICAL_RECEIPT';
  if (lower.includes('receipt') || lower.includes('invoice')) return 'BUSINESS_RECEIPT';
  if (lower.includes('bank') || lower.includes('statement')) return 'BANK_STMT';
  if (lower.includes('paycheck') || lower.includes('pay stub')) return 'PAYSTUB';

  return 'UNKNOWN';
}

// Setup multer for file uploads
const uploadsDir = path.join('/tmp', 'novasolutiontax-uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

// ============================================================================
// INIT
// ============================================================================

const app = express();
const prisma = new PrismaClient();
const storageProvider = createStorageProvider(process.env.STORAGE_TYPE || 'local');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const API_PORT = parseInt(process.env.API_PORT || '3001');

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.officeId = decoded.officeId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

app.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password (TODO: bcryptjs)
    const hashedPassword = password; // TODO: hash

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email,
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== password) {
      // TODO: proper password comparison
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's office (if any)
    const officeUser = await prisma.officeUser.findFirst({
      where: { userId: user.id },
      include: { office: true },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        officeId: officeUser?.officeId,
        role: officeUser?.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// OFFICE ENDPOINTS
// ============================================================================

app.post('/offices', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug } = req.body;
    const userId = req.userId!;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug required' });
    }

    const office = await prisma.office.create({
      data: {
        name,
        slug,
        ownerUserId: userId,
        officeUsers: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    res.status(201).json(office);
  } catch (err) {
    next(err);
  }
});

app.get('/offices/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verify user is in this office
    const officeUser = await prisma.officeUser.findUnique({
      where: { officeId_userId: { officeId: id, userId: req.userId! } },
    });

    if (!officeUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const office = await prisma.office.findUnique({
      where: { id },
      include: {
        officeUsers: true,
        subscription: true,
      },
    });

    res.json(office);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// DOCUMENT INBOX ENDPOINTS
// ============================================================================

/**
 * POST /returns/:returnId/documents/upload
 * Upload a document to a tax return
 */
app.post(
  '/returns/:returnId/documents/upload',
  authMiddleware,
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { returnId } = req.params;
      const userId = req.userId!;
      const officeId = req.officeId!;

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Verify return exists and user has access
      const taxReturn = await prisma.taxReturn.findUnique({
        where: { id: returnId },
        include: { office: true },
      });

      if (!taxReturn) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Return not found' });
      }

      // Verify user is in office
      const officeUser = await prisma.officeUser.findUnique({
        where: { officeId_userId: { officeId: taxReturn.officeId, userId } },
      });

      if (!officeUser) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Access denied' });
      }

      // Classify document
      const documentType = classifyDocument(req.file.originalname);

      // Upload to storage provider
      const fileContent = fs.readFileSync(req.file.path);
      const storageKey = `offices/${taxReturn.officeId}/returns/${returnId}/${req.file.filename}`;

      await storageProvider.upload(storageKey, fileContent, req.file.mimetype);

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      // Create Document record
      const document = await prisma.document.create({
        data: {
          returnId,
          officeId: taxReturn.officeId,
          fileName: req.file.originalname,
          documentType,
          status: 'UPLOADED',
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          storageKey,
          uploadedBy: userId,
          uploadedAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          officeId: taxReturn.officeId,
          entityType: 'DOCUMENT',
          entityId: document.id,
          action: 'CREATED',
          actor: userId,
          changes: {
            created: {
              fileName: document.fileName,
              documentType: document.documentType,
              fileSize: document.fileSize,
            },
          },
        },
      });

      // Queue extraction job (async, don't wait)
      try {
        const { extractionQueue } = await import('@novasolutiontax/workers');
        await extractionQueue.add(
          'extract',
          {
            documentId: document.id,
            returnId,
            officeId: taxReturn.officeId,
          },
          {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );
      } catch (err) {
        console.warn('Failed to queue extraction job:', err);
      }

      res.status(201).json({
        id: document.id,
        fileName: document.fileName,
        documentType,
        status: 'UPLOADED',
        fileSize: req.file.size,
        uploadedAt: document.uploadedAt,
        storageKey,
        message: 'Document uploaded and extraction queued',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /returns/:returnId/documents
 * List all documents for a tax return
 */
app.get('/returns/:returnId/documents', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { returnId } = req.params;
    const userId = req.userId!;

    // Verify return exists and user has access
    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId },
      include: { office: true },
    });

    if (!taxReturn) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Verify user is in office
    const officeUser = await prisma.officeUser.findUnique({
      where: { officeId_userId: { officeId: taxReturn.officeId, userId } },
    });

    if (!officeUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch documents with extraction data
    const documents = await prisma.document.findMany({
      where: { returnId },
      include: {
        extractions: {
          select: {
            id: true,
            status: true,
            confidenceScore: true,
            dataJson: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Format response
    const formattedDocs = documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      documentType: doc.documentType,
      status: doc.status,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
      extraction:
        doc.extractions.length > 0
          ? {
              id: doc.extractions[0].id,
              status: doc.extractions[0].status,
              confidenceScore: doc.extractions[0].confidenceScore,
              extractedAt: doc.extractions[0].createdAt,
              fieldCount: Object.keys(doc.extractions[0].dataJson || {}).length,
            }
          : null,
    }));

    res.json({
      returnId,
      documentCount: documents.length,
      documents: formattedDocs,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /returns/:returnId/documents/:documentId/download
 * Download a document
 */
app.get(
  '/returns/:returnId/documents/:documentId/download',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { returnId, documentId } = req.params;
      const userId = req.userId!;

      // Verify return exists and user has access
      const taxReturn = await prisma.taxReturn.findUnique({
        where: { id: returnId },
        include: { office: true },
      });

      if (!taxReturn) {
        return res.status(404).json({ error: 'Return not found' });
      }

      // Verify user is in office
      const officeUser = await prisma.officeUser.findUnique({
        where: { officeId_userId: { officeId: taxReturn.officeId, userId } },
      });

      if (!officeUser) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Fetch document
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document || document.returnId !== returnId) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // If using S3, return signed URL
      if (process.env.STORAGE_TYPE === 's3') {
        const signedUrl = await storageProvider.getSignedUrl(document.storageKey);
        return res.json({
          documentId,
          fileName: document.fileName,
          signedUrl,
          expiresIn: 3600,
        });
      }

      // Otherwise, download from local storage
      const fileContent = await storageProvider.download(document.storageKey);
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.send(fileContent);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// TAX RETURNS ENDPOINTS
// ============================================================================

app.get('/returns', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { officeId } = req.query;

    if (!officeId) {
      return res.status(400).json({ error: 'officeId required' });
    }

    // Verify user is in office
    const officeUser = await prisma.officeUser.findUnique({
      where: { officeId_userId: { officeId: officeId as string, userId: req.userId! } },
    });

    if (!officeUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const returns = await prisma.taxReturn.findMany({
      where: { officeId: officeId as string },
      include: { client: true, creator: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(returns);
  } catch (err) {
    next(err);
  }
});

app.post('/returns', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { officeId, clientId, taxYear, returnType } = req.body;

    if (!officeId || !clientId) {
      return res.status(400).json({ error: 'officeId and clientId required' });
    }

    // Verify user is in office
    const officeUser = await prisma.officeUser.findUnique({
      where: { officeId_userId: { officeId, userId: req.userId! } },
    });

    if (!officeUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const taxReturn = await prisma.taxReturn.create({
      data: {
        officeId,
        clientId,
        creatorId: req.userId!,
        taxYear: taxYear || new Date().getFullYear(),
        returnType: returnType || 'INDIVIDUAL_1040',
        taxDataJson: {
          filingInfo: {
            filingStatus: 'single',
            taxYear: taxYear || new Date().getFullYear(),
            dependents: 0,
          },
          income: {},
          deductions: {},
          credits: {},
        },
      },
    });

    res.status(201).json(taxReturn);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(API_PORT, () => {
  console.log(`✅ API running on http://localhost:${API_PORT}`);
  console.log(`📊 Health check: http://localhost:${API_PORT}/health`);
});

export default app;
