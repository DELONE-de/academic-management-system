// src/services/faculty.service.ts

import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';

export class FacultyService {
  /**
   * Gets all faculties
   */
  async create(data: { name: string; code: string; description?: string }): Promise<any> {
    const existing = await prisma.faculty.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code.toUpperCase() }] },
    });
    if (existing) throw new AppError('Faculty with this name or code already exists', 400);

    return prisma.faculty.create({
      data: { ...data, code: data.code.toUpperCase() },
    });
  }

  async delete(id: string): Promise<void> {
    const faculty = await prisma.faculty.findUnique({ where: { id } });
    if (!faculty) throw new AppError('Faculty not found', 404);
    await prisma.faculty.delete({ where: { id } });
  }

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