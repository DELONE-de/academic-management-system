// src/services/faculty.service.ts

import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';

export class FacultyService {
  /**
   * Gets all faculties
   */
  async findAll(): Promise<any[]> {
    const faculties = await prisma.faculty.findMany({
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return faculties;
  }

  /**
   * Gets a faculty by ID
   */
  async findById(id: string): Promise<any> {
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: {
        departments: {
          include: {
            _count: {
              select: {
                students: true,
                courses: true,
              },
            },
          },
        },
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    return faculty;
  }
}

export const facultyService = new FacultyService();