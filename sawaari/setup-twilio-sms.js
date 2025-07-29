// Setup script for Twilio SMS integration
require("dotenv").config();
const twilio = require("twilio");

async function setupTwilioSMS() {
  console.log("🔧 Setting up Twilio SMS for OTP verification...\n");

  try {
    // Check if credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log("❌ Twilio credentials not found in .env file");
      console.log("📝 Please add the following to your .env file:");
      console.log("TWILIO_ACCOUNT_SID=your_account_sid_here");
      console.log("TWILIO_AUTH_TOKEN=your_auth_token_here");
      console.log("TWILIO_PHONE_NUMBER=your_twilio_phone_number_here");
      return;
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Test the connection
    console.log("🔍 Testing Twilio connection...");
    const account = await client.api
      .accounts(process.env.TWILIO_ACCOUNT_SID)
      .fetch();
    console.log("✅ Connected to Twilio account:", account.friendlyName);

    // List available phone numbers
    console.log("\n📱 Checking for available phone numbers...");
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });

    if (phoneNumbers.length > 0) {
      console.log("✅ Available phone numbers:");
      phoneNumbers.forEach((number, index) => {
        console.log(
          `${index + 1}. ${number.phoneNumber} (${
            number.friendlyName || "No name"
          })`
        );
      });

      const firstNumber = phoneNumbers[0].phoneNumber;
      console.log(`\n💡 You can use this number in your .env file:`);
      console.log(`TWILIO_PHONE_NUMBER=${firstNumber}`);
    } else {
      console.log("⚠️ No phone numbers found in your Twilio account");
      console.log(
        "📝 You need to purchase a phone number from Twilio Console:"
      );
      console.log("   1. Go to https://console.twilio.com/");
      console.log("   2. Navigate to Phone Numbers > Manage > Buy a number");
      console.log("   3. Purchase a number with SMS capabilities");
      console.log("   4. Add it to your .env file as TWILIO_PHONE_NUMBER");
    }

    // Test SMS sending (if phone number is configured)
    if (
      process.env.TWILIO_PHONE_NUMBER &&
      process.env.TWILIO_PHONE_NUMBER !== "+15005550006"
    ) {
      console.log("\n🧪 Testing SMS sending...");
      console.log(
        "⚠️ This will send a test SMS. Make sure you have a valid phone number."
      );

      // You can uncomment and modify this to test with your own number
      /*
      const testMessage = await client.messages.create({
        body: 'Test message from SAWAARI - Twilio SMS is working!',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+91XXXXXXXXXX' // Replace with your phone number for testing
      });
      console.log('✅ Test SMS sent successfully! Message SID:', testMessage.sid);
      */

      console.log(
        "💡 To test SMS, uncomment the test code in this script and add your phone number"
      );
    }

    console.log("\n🎉 Twilio SMS setup completed!");
    console.log("📝 Next steps:");
    console.log("1. Make sure TWILIO_PHONE_NUMBER is set in your .env file");
    console.log("2. Restart your backend server");
    console.log(
      "3. Try the signup form - you should receive real SMS messages!"
    );
  } catch (error) {
    console.error("❌ Twilio setup failed:", error.message);

    if (error.code === 20003) {
      console.log("💡 This usually means invalid credentials. Please check:");
      console.log("   - TWILIO_ACCOUNT_SID is correct");
      console.log("   - TWILIO_AUTH_TOKEN is correct");
      console.log("   - Both are from the same Twilio project");
    }
  }
}

// Run the setup
setupTwilioSMS();
