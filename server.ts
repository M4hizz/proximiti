import express, { type Request, type Response, type NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import our authentication system
import { 
  authenticate, 
  optionalAuthenticate, 
  requireAdmin,
  extractToken,
  securityHeaders,
  createRateLimiter,
  type AuthenticatedRequest
} from './src/lib/auth';
import authRoutes from './src/lib/routes/auth';
import db from './src/lib/database';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(securityHeaders);

// CORS configuration
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean) as string[];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const globalRateLimit = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
app.use(globalRateLimit);

// Extract token from cookies/headers for all routes
app.use(extractToken);

// Health check endpoint (no auth required)
app.get('/', (req, res) => {
  res.json({
    message: 'Proximiti API is running',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Public health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Authentication routes (public)
app.use('/api', authRoutes);

// Protected business data routes
app.get('/api/businesses', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const businesses = [
      {
        id: "1",
        name: "The Green Kitchen",
        category: "food",
        rating: 4.7,
        reviewCount: 234,
        address: "123 Queen Street West, Toronto, ON M5H 2M9",
        hours: "8:00 AM - 10:00 PM",
        description: "Farm-to-table restaurant serving organic, locally-sourced dishes.",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        lat: 43.6532,
        lng: -79.3832,
        phone: "(416) 123-4567",
        priceLevel: "$$",
      }
    ];

    res.json({
      businesses,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      } : null
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({
      error: 'Failed to fetch businesses',
      message: 'Internal server error'
    });
  }
});

// Protected route - user profile management
app.get('/api/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      isVerified: req.user!.isVerified,
      createdAt: req.user!.createdAt
    }
  });
});

app.put('/api/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Name is required'
      });
    }

    const updatedUser = db.updateUser(req.user!.id, { name: name.trim() });
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'Internal server error'
    });
  }
});

// Admin-only routes
app.get('/api/admin/users', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    const users = db.getAllUsers(limit, offset);
    
    res.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      })),
      pagination: {
        page,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: 'Internal server error'
    });
  }
});

app.put('/api/admin/users/:id/role', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be either "user" or "admin"'
      });
    }

    const updatedUser = db.updateUser(id, { role });
    
    res.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      error: 'Failed to update user role',
      message: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Proximiti API server running on http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Security features enabled: CORS, Helmet, Rate Limiting, JWT Auth`);
  console.log(`🗄️  Database: SQLite with role-based access control`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`⚠️  Development mode: Remember to configure production secrets!`);
  }
});
