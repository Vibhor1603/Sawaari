/* eslint-disable no-unused-vars */
import React, { useState } from "react";
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        padding: "var(--spacing-md)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
        }}
      >
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            padding: "var(--spacing-2xl)",
            border: "1px solid var(--border-color)",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              marginBottom: "var(--spacing-lg)",
              color: "var(--accent-yellow-hover)",
              fontSize: "var(--text-3xl)",
              fontWeight: "bold",
            }}
          >
            Contact Us
          </h2>

          <p
            style={{
              textAlign: "center",
              marginBottom: "var(--spacing-xl)",
              color: "var(--text-secondary)",
              fontSize: "var(--text-lg)",
            }}
          >
            <b>We would love to hear from you!</b>
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  marginBottom: "var(--spacing-sm)",
                  color: "var(--accent-yellow-hover)",
                  fontSize: "var(--text-base)",
                  fontWeight: "500",
                }}
              >
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                style={{
                  width: "100%",
                  padding: "var(--spacing-md)",
                  backgroundColor: "var(--tertiary-dark)",
                  border: `1px solid var(--border-color)`,
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-base)",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--accent-green)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-color)")
                }
              />
            </div>

            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <label
                htmlFor="mobile"
                style={{
                  display: "block",
                  marginBottom: "var(--spacing-sm)",
                  color: "var(--accent-yellow-hover)",
                  fontSize: "var(--text-base)",
                  fontWeight: "500",
                }}
              >
                Mobile number
              </label>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter mobile number"
                required
                style={{
                  width: "100%",
                  padding: "var(--spacing-md)",
                  backgroundColor: "var(--tertiary-dark)",
                  border: `1px solid var(--border-color)`,
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-base)",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--accent-green)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-color)")
                }
              />
            </div>

            <div style={{ marginBottom: "var(--spacing-xl)" }}>
              <label
                htmlFor="feedback"
                style={{
                  display: "block",
                  marginBottom: "var(--spacing-sm)",
                  color: "var(--accent-yellow-hover)",
                  fontSize: "var(--text-base)",
                  fontWeight: "500",
                }}
              >
                Your feedback
              </label>
              <textarea
                id="feedback"
                name="feedback"
                rows="4"
                value={formData.feedback}
                onChange={handleChange}
                placeholder="Enter your feedback"
                required
                style={{
                  width: "100%",
                  padding: "var(--spacing-md)",
                  backgroundColor: "var(--tertiary-dark)",
                  border: `1px solid var(--border-color)`,
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-base)",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                  resize: "vertical",
                  minHeight: "100px",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--accent-green)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-color)")
                }
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "var(--spacing-md) var(--spacing-lg)",
                backgroundColor: "var(--accent-yellow)",
                color: "var(--primary-dark)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-lg)",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "var(--shadow-md)",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "var(--accent-yellow-hover)";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "var(--accent-yellow)";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "var(--shadow-md)";
              }}
            >
              Submit Feedback
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
