import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ContactPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    mobile: "",
    feedback: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/feedbacks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        console.log("feedback submitted");
        navigate("/");
      } else {
        console.log("feedback error");
      }
    } catch (error) {
      console.log(error);
    }

    console.log("Form submitted:", formData);
    setFormData({ email: "", mobile: "", feedback: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 pt-24">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] text-2xl opacity-10 animate-subtle-float">
          📞
        </div>
        <div
          className="absolute top-[30%] right-[15%] text-2xl opacity-10 animate-subtle-float"
          style={{ animationDelay: "1s" }}
        >
          ✉️
        </div>
        <div
          className="absolute bottom-[25%] left-[20%] text-2xl opacity-10 animate-subtle-float"
          style={{ animationDelay: "2s" }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-[35%] right-[25%] text-2xl opacity-10 animate-subtle-float"
          style={{ animationDelay: "3s" }}
        >
          💬
        </div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="glass-strong shadow-sawaari-xl p-8 rounded-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="text-3xl animate-subtle-float">📞</span>
              <h2 className="text-3xl font-bold gradient-text-sawaari">
                Contact Us
              </h2>
              <span className="text-3xl animate-subtle-float">📞</span>
            </div>
            <p className="text-lg text-text-secondary">
              <span className="font-bold text-sawaari-yellow">
                We would love to hear from you!
              </span>
            </p>
            <p className="text-sm text-text-muted font-kalam mt-2">
              आपकी राय हमारे लिए महत्वपूर्ण है
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sawaari-green font-medium"
              >
                📧 Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                className="form-input"
              />
            </div>

            {/* Mobile Field */}
            <div>
              <label
                htmlFor="mobile"
                className="block mb-2 text-sawaari-green font-medium"
              >
                📱 Mobile number
              </label>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter your mobile number"
                required
                className="form-input"
              />
            </div>

            {/* Feedback Field */}
            <div>
              <label
                htmlFor="feedback"
                className="block mb-2 text-sawaari-green font-medium"
              >
                💭 Your feedback
              </label>
              <textarea
                id="feedback"
                name="feedback"
                rows="4"
                value={formData.feedback}
                onChange={handleChange}
                placeholder="Share your thoughts, suggestions, or experiences with SAWAARI..."
                required
                className="form-input resize-vertical min-h-[120px]"
              />
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-primary w-full group">
              <span className="flex items-center justify-center gap-2">
                Submit Feedback
                <span className="text-xl group-hover:animate-subtle-float">
                  🚀
                </span>
              </span>
            </button>
          </form>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
            <p className="text-sm text-gray-200 mb-2">
              🛺 Join the SAWAARI community and help us improve!
            </p>
            <div className="flex justify-center gap-4 text-xs text-gray-200">
              <span>📧 Quick Response</span>
              <span>🔒 Secure & Private</span>
              <span>💝 Much Appreciated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
