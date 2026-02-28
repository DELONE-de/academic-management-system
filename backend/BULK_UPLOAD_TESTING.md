# Bulk Upload Endpoints - Test Documentation

## Overview
Your bulk upload endpoints are ready for testing. Test files have been generated in `test-files/` directory.

## Endpoints

### 1. POST /api/bulk/students
Upload multiple students via Excel file.

**Authentication:** Required (HOD/DEAN)

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (Excel file)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRows": 10,
    "successCount": 8,
    "skippedCount": 2,
    "errorCount": 0
  },
  "message": "Successfully imported 8 students. 2 skipped (duplicates)."
}
```

**Error Response (with error file):**
- Headers: 
  - X-Import-Success: false
  - X-Total-Rows: 10
  - X-Error-Count: 5
- Body: Excel file with error details

---

### 2. GET /api/bulk/students/template
Download student upload template.

**Authentication:** Required (HOD/DEAN)

**Response:** Excel file download

---

### 3. POST /api/bulk/scores
Upload multiple scores via Excel file.

**Authentication:** Required (HOD/DEAN)

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (Excel file)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRows": 50,
    "successCount": 45,
    "updatedCount": 5,
    "errorCount": 0,
    "affectedStudents": 20
  },
  "message": "Successfully processed 45 new scores and updated 5 existing scores. GPA recalculated for 20 students."
}
```

---

### 4. GET /api/bulk/scores/template
Download score upload template.

**Authentication:** Required (HOD/DEAN)

**Response:** Excel file download

---

## Test Files Generated

### Valid Files:
- `students_valid.xlsx` - 3 valid student records
- `scores_valid.xlsx` - 3 valid score records

### Invalid Files (for error testing):
- `students_invalid.xlsx` - Contains validation errors
- `scores_invalid.xlsx` - Contains validation errors

---

## Manual Testing Steps

### Step 1: Start Server
```bash
npm run dev
```

### Step 2: Login and Get Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

Save the token from response.

### Step 3: Test Student Upload (Valid)
```bash
curl -X POST http://localhost:3000/api/bulk/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-files/students_valid.xlsx"
```

**Expected:** Success response with successCount: 3

### Step 4: Test Student Upload (Invalid)
```bash
curl -X POST http://localhost:3000/api/bulk/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-files/students_invalid.xlsx" \
  --output error_report.xlsx
```

**Expected:** Excel file with error details

### Step 5: Test Score Upload (Valid)
```bash
curl -X POST http://localhost:3000/api/bulk/scores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-files/scores_valid.xlsx"
```

**Expected:** Success response with score counts

### Step 6: Test Score Upload (Invalid)
```bash
curl -X POST http://localhost:3000/api/bulk/scores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-files/scores_invalid.xlsx" \
  --output score_errors.xlsx
```

**Expected:** Excel file with error details

### Step 7: Download Templates
```bash
# Student template
curl -X GET http://localhost:3000/api/bulk/students/template \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output student_template.xlsx

# Score template
curl -X GET http://localhost:3000/api/bulk/scores/template \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output score_template.xlsx
```

**Expected:** Template Excel files

---

## Testing with Postman

1. **Import Collection:**
   - Create new request
   - Set method to POST
   - URL: `http://localhost:3000/api/bulk/students`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body: form-data, key: `file`, type: File, value: select Excel file

2. **Test Scenarios:**
   - Valid file upload
   - Invalid file format (.txt, .pdf)
   - Missing file
   - Invalid data in Excel
   - Duplicate records
   - Unauthorized access (no token)

---

## Key Features Tested

✅ **File Upload:**
- Excel file parsing
- Multipart form data handling
- File validation

✅ **Data Validation:**
- Required fields check
- Data type validation
- Business rule validation
- Duplicate detection

✅ **Error Handling:**
- Row-level error tracking
- Error file generation
- Detailed error messages

✅ **Authorization:**
- Authentication required
- Role-based access (HOD/DEAN)
- Department-level restrictions

✅ **Database Operations:**
- Bulk insert with transaction
- Duplicate handling (skipDuplicates)
- GPA recalculation for affected students

✅ **Response Handling:**
- Success with statistics
- Error file download
- Template download

---

## Expected Validations

### Student Upload:
- Matric Number: Required, unique
- First Name: Required
- Last Name: Required
- Department Code: Must exist in database
- Admission Year: Valid year (1900-current)
- Current Level: Valid enum value
- HOD can only upload to their department

### Score Upload:
- Matric Number: Must exist in database
- Course Code: Must exist in student's department
- Score: 0-100
- Academic Year: Valid format (YYYY/YYYY)
- HOD can only add scores for their department
- Duplicate scores are updated, not rejected

---

## Troubleshooting

**Issue:** "No file uploaded"
- Ensure form field name is `file`
- Check Content-Type is multipart/form-data

**Issue:** "Department not found"
- Verify department codes in database
- Check case sensitivity

**Issue:** "Unauthorized"
- Verify token is valid
- Check Authorization header format

**Issue:** "Student already exists"
- Check for duplicate matric numbers
- Review skippedCount in response

---

## Performance Notes

- Bulk operations use transactions for data integrity
- GPA recalculation is batched by student/semester
- Large files (1000+ rows) may take 5-10 seconds
- Error file generation adds minimal overhead
