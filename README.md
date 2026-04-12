# Academic Management System - Backend API

## Overview
The Academic Management System Backend is a robust REST API built with Express.js and TypeScript that manages student academic records, grades, and GPA calculations for educational institutions.

## What It Is
A comprehensive backend service that handles all academic data management for universities and colleges, including students, courses, departments, faculties, and academic performance tracking.

## Features
- **User Authentication & Authorization** - Role-based access control (DEAN, HOD) with JWT token authentication
- **Student Management** - Create, update, and manage student records with admission tracking
- **Course Management** - Define courses by level and semester with credit units
- **Result Management** - Record and process student grades for courses
- **GPA Calculation** - Automatically calculate semester GPA and CGPA based on grades and credit units
- **Bulk Operations** - Import multiple students and grades via Excel files
- **Department & Faculty Management** - Organize academic structure hierarchically
- **Report Generation** - Generate academic performance reports in PDF format
- **Data Export** - Export student results and GPA data to Excel
- **Input Validation** - Comprehensive validation using Zod schemas
- **Security** - CORS protection, helmet for HTTP headers, password hashing with bcrypt
- **Database Migrations** - Versioned schema changes with Prisma migrations

## What It Can Do
- Login with role-based access
- Upload bulk student data from CSV/Excel
- Upload bulk grades and calculate GPAs automatically
- Generate student transcripts and academic reports
- Filter results by student, course, level, and semester
- Export data to PDF and Excel formats
- Track student progression across levels
- Monitor departmental academic performance
- Change user passwords securely

## Problems It Solves
1. **Manual Grade Recording** - Eliminates tedious manual entry of grades
2. **GPA Calculation Errors** - Automates accurate GPA calculations
3. **Data Organization** - Centralizes scattered student records
4. **Report Generation** - Quickly generates academic transcripts
5. **Bulk Data Import** - Handles importing hundreds of records at once
6. **Audit Trail** - Maintains timestamps for all data modifications

## How It Solves Them
- **Bulk Upload System** - Accepts Excel files and processes records in batches
- **Automated Calculations** - GPA formula engine calculates instantly after grades are recorded
- **Structured Database** - PostgreSQL with Prisma ORM ensures data integrity
- **PDF Generation** - Generates professional academic reports on demand
- **Role-Based Access** - DEAN and HOD permissions control who can access what
- **Data Validation** - Zod validators ensure all data meets requirements before storage

## Tech Stack
- Express.js (REST API framework)
- TypeScript (Type safety)
- PostgreSQL (Database)
- Prisma ORM (Database client)
- JWT (Authentication)
- bcryptjs (Password hashing)
- Multer (File uploads)
- PDFKit (PDF generation)
- XLSX (Excel file handling)

## Key Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/bulk/students` - Bulk upload students
- `POST /api/bulk/results` - Bulk upload results
- `GET /api/students` - List all students
- `GET /api/results/:studentId` - Get student results
- `GET /api/gpa/:studentId` - Get student GPA
- `GET /api/report/transcript/:studentId` - Generate transcript

# Academic Management System - Frontend

## Overview
The Academic Management System Frontend is a modern web application built with Next.js 14 and React 18 that provides an intuitive interface for managing academic records, viewing grades, and monitoring student performance.

## What It Is
A user-friendly web dashboard that connects to the backend API, enabling students, department heads, and faculty deans to view and manage academic information in real-time.

## Features
- **User Authentication** - Secure login with email and password
- **Dashboard** - Overview of key academic information and statistics
- **Student Management** - View and manage student records by department
- **Grade Viewing** - Display student results organized by course and semester  
- **GPA Display** - Show semester GPA and cumulative GPA (CGPA)
- **Bulk Upload Interface** - Upload multiple students and grades via Excel files
- **Report Generation** - View and download academic transcripts
- **Performance Charts** - Visualize student performance trends with chart.js
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Role-Based UI** - Different views for students, HODs, and deans
- **Real-time Data** - Fetch latest data from the backend API
- **Form Validation** - Client-side validation with immediate feedback

## What It Can Do
- Log in with institutional credentials
- View personal academic records (for students)
- Browse all students in department (for HODs)
- Monitor faculty performance (for deans)
- Upload bulk student data via Excel
- Upload and process bulk grades
- Download academic transcripts as PDF
- View GPA calculations and academic standing
- Filter students by level, department, or status
- Generate performance reports with charts
- Update user passwords
- View course information and grades

## Problems It Solves
1. **Slow Academic Information Access** - Instant access to grades and GPA instead of waiting for paper reports
2. **Poor Data Visualization** - Charts show performance trends clearly
3. **Manual Bulk Processing** - Excel uploads replace manual data entry
4. **Paper-Based Workflows** - Digital system eliminates paper transcripts
5. **Limited Access to Records** - Role-based access allows 24/7 availability
6. **Disconnected Information** - Centralized platform for all academic data

## How It Solves Them
- **Real-time API Integration** - Fetches data instantly from backend
- **Chart Visualizations** - Uses chart.js to display performance graphs
- **Bulk Upload Component** - Simplified Excel import interface with progress tracking
- **PDF Download** - One-click transcript generation and download
- **Authentication System** - Secure login with role-based redirects
- **Centralized Dashboard** - Single source of truth for all academic information

## Tech Stack
- Next.js 14 (React framework)
- React 18 (UI library)
- TypeScript (Type safety)
- Tailwind CSS (Styling)
- React Hook Form (Form management)
- Zod (Schema validation)
- Axios (HTTP client)
- Chart.js (Data visualization)
- React Hot Toast (Notifications)

## Key Pages
- `/` - Home/Dashboard
- `/login` - Authentication page
- `/students` - Student management
- `/results` - View academic results
- `/gpa` - View GPA information
- `/bulk-upload` - Bulk data upload
- `/reports` - Academic reports and transcripts
- `/profile` - User profile settings

## Key Features by Role
**Student:**
- View personal grades
- Download transcript
- Monitor GPA

**HOD (Head Of Department):**
- View all department students
- Upload bulk results
- Generate department reports

**DEAN (Faculty Dean):**
- View all faculty students
- Monitor faculty performance
- Generate faculty reports
