export default function About() {
  return (
    <section className="about">
      <div className="container">
        {/* About Us Section */}
        <div className="row align-items-center mb-5">
          <div className="col-lg-6 mb-4 mb-lg-0">
            <div className="position-relative">
              <img
                src="/download.jpeg"
                className="img-fluid auto-image"
                alt="Auto Rickshaw Service"
              />
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center opacity-0 hover-overlay">
                <div className="text-center text-white">
                  <i className="fas fa-play-circle fa-3x mb-2"></i>
                  <p>Watch Our Story</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="ps-lg-4">
              <h1 className="headings mb-4">About SAWAARI</h1>
              <p
                className="lead mb-4"
                style={{ color: "var(--text-secondary)", lineHeight: "1.8" }}
              >
                Welcome to SAWAARI, your smart transportation companion! We are
                revolutionizing urban commuting by providing real-time
                information on auto rickshaw availability and intelligent route
                planning.
              </p>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.7" }}>
                Understanding the challenges of finding reliable transportation
                in busy metropolitan cities, our platform bridges the gap
                between commuters and drivers with innovative, technology-driven
                solutions that make every journey seamless and efficient.
              </p>
            </div>
          </div>
        </div>

        {/* What We Offer Section */}
        <div className="row align-items-center">
          <div className="col-lg-6 order-lg-2 mb-4 mb-lg-0">
            <div className="position-relative">
              <img
                src="/auto-rik.jpeg"
                className="img-fluid auto-image"
                alt="Our Services"
              />
            </div>
          </div>
          <div className="col-lg-6 order-lg-1">
            <div className="pe-lg-4">
              <h1 className="headings mb-4">What We Offer</h1>
              <div className="row">
                <div className="col-12 mb-3">
                  <div className="d-flex align-items-start">
                    <div className="flex-shrink-0 me-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: "50px",
                          height: "50px",
                          background: "var(--gradient-primary)",
                        }}
                      >
                        <i
                          className="fas fa-map-marker-alt"
                          style={{ color: "var(--primary-dark)" }}
                        ></i>
                      </div>
                    </div>
                    <div>
                      <h5
                        className="mb-2"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Real-time Hotspots
                      </h5>
                      <p
                        className="mb-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Check auto rickshaw availability in real-time with
                        color-coded hotspots based on driver density.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-12 mb-3">
                  <div className="d-flex align-items-start">
                    <div className="flex-shrink-0 me-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: "50px",
                          height: "50px",
                          background: "var(--gradient-primary)",
                        }}
                      >
                        <i
                          className="fas fa-route"
                          style={{ color: "var(--primary-dark)" }}
                        ></i>
                      </div>
                    </div>
                    <div>
                      <h5
                        className="mb-2"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Smart Route Planning
                      </h5>
                      <p
                        className="mb-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Get detailed route information and transparent fare
                        estimates for your desired destinations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-12 mb-3">
                  <div className="d-flex align-items-start">
                    <div className="flex-shrink-0 me-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: "50px",
                          height: "50px",
                          background: "var(--gradient-primary)",
                        }}
                      >
                        <i
                          className="fas fa-users"
                          style={{ color: "var(--primary-dark)" }}
                        ></i>
                      </div>
                    </div>
                    <div>
                      <h5
                        className="mb-2"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Ride Sharing
                      </h5>
                      <p
                        className="mb-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Find travel companions for cost-effective and
                        eco-friendly shared rides.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <div className="flex-shrink-0 me-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: "50px",
                          height: "50px",
                          background: "var(--gradient-primary)",
                        }}
                      >
                        <i
                          className="fas fa-mobile-alt"
                          style={{ color: "var(--primary-dark)" }}
                        ></i>
                      </div>
                    </div>
                    <div>
                      <h5
                        className="mb-2"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Seamless Experience
                      </h5>
                      <p
                        className="mb-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        User-friendly interface designed for hassle-free daily
                        commuting with continuous improvements.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
