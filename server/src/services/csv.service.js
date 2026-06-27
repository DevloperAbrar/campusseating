const Papa = require("papaparse");
const fs = require("fs");

/**
 * Parse a CSV file from disk and return { data, errors }
 */
const parseCSVFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  fs.unlinkSync(filePath); // clean up temp file

  const { data, errors } = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  return { data, errors };
};

/**
 * Validate that all required columns exist in CSV header row
 */
const validateColumns = (row, required) => {
  const keys = Object.keys(row || {});
  const missing = required.filter((c) => !keys.includes(c));
  return missing;
};

/**
 * Build a CSV string from an array of objects
 */
const buildCSV = (rows) => {
  if (!rows?.length) return "";
  return Papa.unparse(rows);
};

/**
 * Student CSV template columns with sample row
 */
const STUDENT_CSV_TEMPLATE = buildCSV([
  {
    name: "Rahul Sharma",
    email: "rahul@college.edu",
    enrollmentNo: "0901CS211001",
    branchCode: "CSE",
    year: 2,
    gender: "male",
    phone: "9876543210",
    specialNeeds: "false",
  },
  {
    name: "Priya Mehta",
    email: "priya@college.edu",
    enrollmentNo: "0901IOT211002",
    branchCode: "IOT",
    year: 3,
    gender: "female",
    phone: "9876543211",
    specialNeeds: "false",
  },
]);

module.exports = { parseCSVFile, validateColumns, buildCSV, STUDENT_CSV_TEMPLATE };