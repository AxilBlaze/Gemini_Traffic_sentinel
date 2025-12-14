import { send } from '@emailjs/browser';
import { TrafficViolation } from '../types';

// EmailJS Configuration
// User provided Public Key
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Credentials provided by user
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

/**
 * Sends an email notification to the vehicle owner using EmailJS.
 */
export const sendViolationEmail = async (violation: TrafficViolation) => {
  if (!violation.owner_email) {
    console.log("ℹ️ Email skipped: No email address found for vehicle owner.");
    return;
  }

  console.log(`📧 Sending violation email to ${violation.owner_email}...`);

  // We map the email to multiple common variable names to ensure compatibility
  // with however the user has configured the "To" field in their EmailJS Template.
  const templateParams = {
    to_name: violation.owner_name || "Vehicle Owner",

    // Multiple aliases for the recipient email to fix "recipients address is empty" error
    to_email: violation.owner_email,
    email: violation.owner_email,
    reply_to: violation.owner_email,
    recipient: violation.owner_email,

    vehicle_number: violation.vehicle_number,
    violation_list: violation.violation_type.map(v => v.replace(/_/g, ' ').toUpperCase()).join(', '),
    fine_amount: violation.total_fine,
    date: new Date(violation.timestamp).toLocaleString(),
    evidence_link: violation.image_url,
    location: "AI Traffic Cam - Main Sector",
    message: `A traffic violation has been recorded for your vehicle ${violation.vehicle_number}.`
  };

  try {
    const response = await send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log('✅ EMAIL SENT SUCCESSFULLY!', response.status, response.text);
    return response;
  } catch (error: any) {
    console.error('❌ FAILED to send email.');

    // Attempt to log meaningful error message from EmailJS object
    if (error && typeof error === 'object') {
      if (error.text) {
        console.error('EmailJS Error Message:', error.text);
      } else {
        console.error('Error Object:', JSON.stringify(error));
      }
    } else {
      console.error('Error:', error);
    }

    // Rethrow error so the UI (AdminDashboard) knows it failed
    throw error;
  }
};