import { useState, useEffect } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Set document title
  useEffect(() => {
    document.title = "Contact Us - SAWAARI";
    return () => {
      document.title = "SAWAARI - Smart Rickshaw Navigation";
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

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

      const result = await response.json();

      if (result.success) {
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          message: "",
        });
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 relative overflow-hidden">
      {/* Minimal Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {["📧", "🛺", "💬"].map((icon, i) => (
          <div
            key={i}
            className="absolute text-xl opacity-8 animate-drift"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 2}s`,
            }}
          >
            {icon}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="container-sawaari pt-16 pb-8">
        <div className="max-w-md mx-auto">
          {/* Contact Form */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                <span className="text-xl">📞</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white text-readable">
                  Contact Us
                </h1>
                <p className="text-sm text-gray-200 text-readable-secondary">
                  Send us your feedback
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-sawaari-yellow mb-1 text-readable">
                  <span className="mr-2">👤</span>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 transition-all duration-300"
                  placeholder="Your full name"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-sawaari-yellow mb-1 text-readable">
                  <span className="mr-2">📧</span>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 transition-all duration-300"
                  placeholder="your@email.com"
                />
              </div>

              {/* Message Field */}
              <div>
                <label className="block text-sm font-semibold text-sawaari-yellow mb-1 text-readable">
                  <span className="mr-2">💬</span>
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 transition-all duration-300 resize-vertical"
                  placeholder="How can we help you?"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-sawaari-yellow to-sawaari-yellow/80 text-black font-medium text-sm rounded-lg shadow-sawaari-subtle hover:shadow-sawaari-glow hover:-translate-y-0.5 transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">📤</span>
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {submitStatus === "success" && (
                <div className="p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-lg">✅</span>
                    <div>
                      <p className="text-green-200 font-semibold text-sm">
                        Message sent successfully!
                      </p>
                      <p className="text-green-300 text-xs">
                        We&apos;ll get back to you soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-lg">❌</span>
                    <div>
                      <p className="text-red-200 font-semibold text-sm">
                        Failed to send message
                      </p>
                      <p className="text-red-300 text-xs">
                        Please try again later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-gray-200">
                <span className="text-blue-400 font-semibold">📧 Email:</span>{" "}
                sawaaribyvibhor@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
