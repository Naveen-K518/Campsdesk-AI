import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, AuthUser } from '../middleware/auth';

let io: SocketIOServer | null = null;

export function initSocketService(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  // Require a valid JWT during the Socket.io handshake (socket.handshake.auth.token).
  // Reject connections without one.
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (typeof socket.handshake.headers['authorization'] === 'string'
        ? socket.handshake.headers['authorization'].replace(/^Bearer\s+/i, '')
        : null);

    if (!token) {
      return next(new Error('Authentication error: Access token required'));
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
      socket.data.user = decoded as AuthUser;
      next();
    });
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Server-managed rooms based on verified token:
    // 1. Each user joins their own user room
    socket.join(`user:${user.id}`);

    // Students join their student rooms
    if (user.role === 'student') {
      socket.join(`student:${user.id}`);
      if (user.studentId) {
        socket.join(`student:${user.studentId}`);
      }
    }

    // 2. Mentors join their mentor room
    if (user.role === 'mentor' || user.role === 'faculty') {
      socket.join(`mentor:${user.id}`);
    }

    // 3. Admins join the admin room
    if (user.role === 'admin') {
      socket.join('admin:room');
    }

    socket.on('disconnect', () => {
      // Disconnection handled cleanly
    });
  });

  console.log('[SocketService] Real-time WebSocket server initialized with JWT handshake verification');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// Emit query:created only to the student's room, assigned mentor's room, and the admin room
export function emitDocketCreated(query: any): void {
  if (!io) return;
  const studentId = query.studentId || query.student_id;
  const mentorId = query.assignedMentorId || query.assigned_mentor_id;

  const targetRooms: string[] = ['admin:room'];
  if (studentId) {
    targetRooms.push(`student:${studentId}`);
    targetRooms.push(`user:${studentId}`);
  }
  if (mentorId) {
    targetRooms.push(`mentor:${mentorId}`);
  }

  io.to(targetRooms).emit('query:created', query);
}

// Emit query:updated only to the student's room, assigned mentor's room, and the admin room
export function emitDocketUpdated(query: any): void {
  if (!io) return;
  const studentId = query.studentId || query.student_id;
  const mentorId = query.assignedMentorId || query.assigned_mentor_id;

  const targetRooms: string[] = ['admin:room'];
  if (studentId) {
    targetRooms.push(`student:${studentId}`);
    targetRooms.push(`user:${studentId}`);
  }
  if (mentorId) {
    targetRooms.push(`mentor:${mentorId}`);
  }

  io.to(targetRooms).emit('query:updated', query);
}
