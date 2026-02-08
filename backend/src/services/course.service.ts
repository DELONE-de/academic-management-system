// src/services/course.service.ts

import { Level, Semester } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { CreateCourseInput, UpdateCourseInput } from '../validators/course.validator.js';

export class CourseService {
  /**
   * Creates a new course
   */
  async create(input: CreateCourseInput): Promise<any> {
    // Check if course code already exists in department
    const existing = await prisma.course.findUnique({
      where: {
        code_departmentId: {
          code: input.code,
          departmentId: input.departmentId,
        },
      },
    });

    if (existing) {
      throw new AppError('Course code already exists in this department', 400);
    }

    const course = await prisma.course.create({
      data: input,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return course;
  }

  /**
   * Gets all courses with filtering
   */
  async findAll(params: {
    departmentId?: string;
    level?: Level;
    semester?: Semester;
    search?: string;
  }): Promise<any[]> {
    const { departmentId, level, semester, search } = params;

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (level) {
      where.level = level;
    }

    if (semester) {
      where.semester = semester;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }, { code: 'asc' }],
    });

    return courses;
  }

  /**
   * Gets courses by department, level, and semester
   */
  async getByDepartmentLevelSemester(
    departmentId: string,
    level: Level,
    semester: Semester
  ): Promise<any[]> {
    const courses = await prisma.course.findMany({
      where: {
        departmentId,
        level,
        semester,
      },
      orderBy: { code: 'asc' },
    });

    return courses;
  }

  /**
   * Gets a course by ID
   */
  async findById(id: string): Promise<any> {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true, code: true, passMark: true },
        },
      },
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    return course;
  }

  /**
   * Updates a course
   */
  async update(id: string, input: UpdateCourseInput): Promise<any> {
    const existing = await prisma.course.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Course not found', 404);
    }

    const course = await prisma.course.update({
      where: { id },
      data: input,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return course;
  }

  /**
   * Deletes a course
   */
  async delete(id: string): Promise<void> {
    const existing = await prisma.course.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Course not found', 404);
    }

    // Check if course has results
    const resultsCount = await prisma.result.count({
      where: { courseId: id },
    });

    if (resultsCount > 0) {
      throw new AppError(
        'Cannot delete course with existing results. Delete results first.',
        400
      );
    }

    await prisma.course.delete({
      where: { id },
    });
  }
}

export const courseService = new CourseService();