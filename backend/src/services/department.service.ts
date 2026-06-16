// src/services/department.service.ts

import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';

export class DepartmentService {
  /**
   * Gets all departments
   */
  async create(data: { name: string; code: string; description?: string; passMark?: number; facultyId: string }): Promise<any> {
    const existing = await prisma.department.findFirst({
      where: { OR: [{ code: data.code.toUpperCase() }, { name: data.name, facultyId: data.facultyId }] },
    });
    if (existing) throw new AppError('Department with this code or name already exists in this faculty', 400);

    return prisma.department.create({
      data: { ...data, code: data.code.toUpperCase() },
      include: { faculty: { select: { id: true, name: true, code: true } } },
    });
  }

  async delete(id: string): Promise<void> {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) throw new AppError('Department not found', 404);
    await prisma.department.delete({ where: { id } });
  }

  async findAll(facultyId?: string): Promise<any[]> {
    const where = facultyId ? { facultyId } : {};

    const departments = await prisma.department.findMany({
      where,
      include: {
        faculty: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: {
            students: true,
            courses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments;
  }

  /**
   * Gets a department by ID
   */
  async findById(id: string): Promise<any> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        faculty: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: {
            students: true,
            courses: true,
          },
        },
      },
    });

    if (!department) {
      throw new AppError('Department not found', 404);
    }

    return department;
  }

  /**
   * Gets departments for a specific faculty
   */
  async getByFaculty(facultyId: string): Promise<any[]> {
    const departments = await prisma.department.findMany({
      where: { facultyId },
      include: {
        _count: {
          select: {
            students: true,
            courses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments;
  }
}

export const departmentService = new DepartmentService();