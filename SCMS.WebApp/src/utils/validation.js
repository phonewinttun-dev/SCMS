/**
 * Centralized Input Filtering & Validation Utilities for SCMS
 */

/**
 * Sanitizes text input by stripping malicious HTML, script tags, null bytes,
 * and normalizing redundant whitespace.
 */
export const sanitizeText = (val) => {
  if (val == null) return "";
  let text = String(val)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove ASCII control characters
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove <script>...</script>
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .trim();
  return text;
};

/**
 * Converts Myanmar digits (၀-၉) to ASCII digits (0-9).
 */
export const convertMyanmarDigitsToAscii = (str) => {
  if (!str) return "";
  const myanmarDigits = "၀၁၂၃၄၅၆၇၈၉";
  return String(str).replace(/[၀-၉]/g, (ch) => String(myanmarDigits.indexOf(ch)));
};

/**
 * Validates and normalizes Myanmar mobile phone numbers.
 * Allowed formats: 09..., +959..., 959... with 7-9 digits after prefix.
 */
export const validateMyanmarMobile = (phone, isRequired = false) => {
  if (!phone || !String(phone).trim()) {
    if (isRequired) {
      return { isValid: false, error: "Phone number is required." };
    }
    return { isValid: true, normalized: "" };
  }

  const raw = convertMyanmarDigitsToAscii(phone).replace(/[\s\-()]/g, "");

  // Must match Myanmar mobile patterns:
  // Starts with 09, 959, or +959 followed by 7 to 9 digits (total 9-11 digits for 09 format)
  const regex = /^(?:\+?959|09)(\d{7,9})$/;
  const match = raw.match(regex);

  if (!match) {
    return {
      isValid: false,
      error: "Invalid Myanmar phone number format. Please use '09...' with 7 to 9 digits (e.g. 09123456789).",
    };
  }

  const normalized = `09${match[1]}`;
  return { isValid: true, normalized };
};

/**
 * Validates email address format.
 */
export const validateEmail = (email, isRequired = false) => {
  if (!email || !String(email).trim()) {
    if (isRequired) {
      return { isValid: false, error: "Email address is required." };
    }
    return { isValid: true, normalized: "" };
  }

  const cleaned = sanitizeText(email).toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid email address (e.g. name@example.com)." };
  }

  return { isValid: true, normalized: cleaned };
};

/**
 * Validates date of birth: cannot be in the future, age cannot exceed 130 years.
 */
export const validateDateOfBirth = (dobString, isRequired = false) => {
  if (!dobString || !String(dobString).trim()) {
    if (isRequired) {
      return { isValid: false, error: "Date of birth is required." };
    }
    return { isValid: true, age: null, normalized: "" };
  }

  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return { isValid: false, error: "Invalid date of birth provided." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dob > today) {
    return { isValid: false, error: "Date of birth cannot be in the future." };
  }

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age > 130) {
    return { isValid: false, error: "Age cannot exceed 130 years." };
  }

  return { isValid: true, age, normalized: dobString };
};

/**
 * Validates and normalizes blood type.
 */
export const validateBloodType = (bloodType, isRequired = false) => {
  const allowed = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (!bloodType || !String(bloodType).trim()) {
    if (isRequired) {
      return { isValid: false, error: "Please select a valid blood type." };
    }
    return { isValid: true, normalized: "O+" };
  }

  const normalized = String(bloodType).trim().toUpperCase();
  if (!allowed.includes(normalized)) {
    return { isValid: false, error: "Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-." };
  }

  return { isValid: true, normalized };
};

/**
 * Validates gender.
 */
export const validateGender = (gender, isRequired = false) => {
  if (!gender || !String(gender).trim()) {
    if (isRequired) {
      return { isValid: false, error: "Please select a gender." };
    }
    return { isValid: true, normalized: "Other" };
  }

  const lower = String(gender).trim().toLowerCase();
  let normalized = "Other";
  if (lower === "male" || lower === "m") normalized = "Male";
  else if (lower === "female" || lower === "f") normalized = "Female";

  return { isValid: true, normalized };
};

/**
 * Validates numeric range.
 */
export const validateNumberRange = (val, { label = "Value", min = 0, max = Infinity, isInteger = false, isRequired = true } = {}) => {
  if (val == null || String(val).trim() === "") {
    if (isRequired) {
      return { isValid: false, error: `${label} is required.` };
    }
    return { isValid: true, value: null };
  }

  const num = Number(val);
  if (isNaN(num)) {
    return { isValid: false, error: `${label} must be a valid number.` };
  }

  if (isInteger && !Number.isInteger(num)) {
    return { isValid: false, error: `${label} must be a whole number (integer).` };
  }

  if (num < min) {
    return { isValid: false, error: `${label} cannot be less than ${min}.` };
  }

  if (num > max) {
    return { isValid: false, error: `${label} cannot exceed ${max}.` };
  }

  return { isValid: true, value: num };
};

/**
 * Validates clinical vital signs physiological limits.
 */
export const validateClinicalVitals = ({
  systolic,
  diastolic,
  temperature,
  pulse,
  spO2,
  weight,
  height,
}) => {
  if (systolic != null && systolic !== "") {
    const s = Number(systolic);
    if (isNaN(s) || s < 50 || s > 300) {
      return { isValid: false, error: "Systolic Blood Pressure must be between 50 and 300 mmHg." };
    }
  }

  if (diastolic != null && diastolic !== "") {
    const d = Number(diastolic);
    if (isNaN(d) || d < 30 || d > 200) {
      return { isValid: false, error: "Diastolic Blood Pressure must be between 30 and 200 mmHg." };
    }
  }

  if (systolic && diastolic && Number(systolic) <= Number(diastolic)) {
    return { isValid: false, error: "Systolic Blood Pressure must be higher than Diastolic Blood Pressure." };
  }

  if (temperature != null && temperature !== "") {
    const t = Number(temperature);
    if (isNaN(t) || t < 90 || t > 110) {
      return { isValid: false, error: "Body Temperature must be between 90.0°F and 110.0°F." };
    }
  }

  if (pulse != null && pulse !== "") {
    const p = Number(pulse);
    if (isNaN(p) || p < 30 || p > 250) {
      return { isValid: false, error: "Heart rate (pulse) must be between 30 and 250 bpm." };
    }
  }

  if (spO2 != null && spO2 !== "") {
    const o = Number(spO2);
    if (isNaN(o) || o < 50 || o > 100) {
      return { isValid: false, error: "Oxygen Saturation (SpO2) must be between 50% and 100%." };
    }
  }

  if (weight != null && weight !== "") {
    const w = Number(weight);
    if (isNaN(w) || w < 1 || w > 500) {
      return { isValid: false, error: "Weight must be between 1 and 500 kg." };
    }
  }

  if (height != null && height !== "") {
    const h = Number(height);
    if (isNaN(h) || h < 30 || h > 300) {
      return { isValid: false, error: "Height must be between 30 and 300 cm." };
    }
  }

  return { isValid: true };
};

/**
 * Rigorous comprehensive validation for Patient Profile creation and editing
 */
export const validatePatientProfile = (profile) => {
  const errors = {};

  // 1. Full Name (Required, 2-100 chars, letters/spaces/periods/hyphens)
  const cleanName = sanitizeText(profile?.name || profile?.fullName);
  if (!cleanName) {
    errors.name = "Full Name is required.";
  } else if (cleanName.length < 2) {
    errors.name = "Full Name must be at least 2 characters.";
  } else if (cleanName.length > 100) {
    errors.name = "Full Name cannot exceed 100 characters.";
  } else if (/^\d+$/.test(cleanName)) {
    errors.name = "Full Name cannot consist solely of numbers.";
  }

  // 2. Gender (Required)
  const genderValidation = validateGender(profile?.gender, true);
  if (!genderValidation.isValid) {
    errors.gender = genderValidation.error;
  }

  // 3. Blood Type (Required)
  const bloodValidation = validateBloodType(profile?.bloodType, true);
  if (!bloodValidation.isValid) {
    errors.bloodType = bloodValidation.error;
  }

  // 4. Date of Birth (Required)
  const rawDob = profile?.dateOfBirth || profile?.dob;
  if (!rawDob && !profile?.age) {
    errors.dateOfBirth = "Date of Birth is required.";
  } else if (rawDob) {
    const dobValidation = validateDateOfBirth(rawDob, true);
    if (!dobValidation.isValid) {
      errors.dateOfBirth = dobValidation.error;
    }
  } else if (profile?.age != null) {
    const ageNum = parseInt(profile.age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      errors.dateOfBirth = "Age must be between 0 and 130 years.";
    }
  }

  // 5. Mobile Number (Required)
  const rawPhone = profile?.mobileNo || profile?.phone;
  if (!rawPhone || !String(rawPhone).trim()) {
    errors.mobileNo = "Primary mobile number is required.";
  } else {
    const phoneValidation = validateMyanmarMobile(rawPhone, true);
    if (!phoneValidation.isValid) {
      errors.mobileNo = phoneValidation.error;
    }
  }

  // 6. Residential Address (Required, min 5 chars)
  const cleanAddress = sanitizeText(profile?.actualAddress || profile?.address);
  if (!cleanAddress) {
    errors.actualAddress = "Residential Address is required.";
  } else if (cleanAddress.length < 5) {
    errors.actualAddress = "Residential Address must be at least 5 characters.";
  }

  // 7. Email (Optional, but if provided, must be valid)
  if (profile?.email && String(profile.email).trim()) {
    const emailValidation = validateEmail(profile.email, false);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }
  }

  const errorKeys = Object.keys(errors);
  const isValid = errorKeys.length === 0;
  const firstError = isValid ? null : errors[errorKeys[0]];

  let formattedDob = rawDob ? String(rawDob).split("T")[0] : null;
  if (!formattedDob && profile?.age && !isNaN(parseInt(profile.age))) {
    const approxYear = new Date().getFullYear() - parseInt(profile.age);
    formattedDob = `${approxYear}-01-01`;
  }

  return {
    isValid,
    errors,
    firstError,
    sanitized: {
      name: cleanName,
      fullName: cleanName,
      gender: genderValidation.normalized || "Male",
      bloodType: bloodValidation.normalized || "O+",
      dateOfBirth: formattedDob,
      mobileNo: rawPhone ? (validateMyanmarMobile(rawPhone, false).normalized || rawPhone) : null,
      phone: rawPhone ? (validateMyanmarMobile(rawPhone, false).normalized || rawPhone) : null,
      email: profile?.email ? sanitizeText(profile.email).toLowerCase() : null,
      actualAddress: cleanAddress,
      address: cleanAddress,
      allergies: sanitizeText(profile?.allergies) || "None reported",
      chronicConditions: sanitizeText(profile?.chronicConditions) || "None reported",
    },
  };
};
