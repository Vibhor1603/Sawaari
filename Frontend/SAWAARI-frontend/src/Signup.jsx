/* eslint-disable react/prop-types */
export default function Signup({ userinfo, handleInput, handleSubmit }) {
    return (
      <>
        <div className="container signup ">
          <form method="POST" onSubmit={handleSubmit}>
            <input
              type="text"
              className="form-control mt-3"
              name="name"
              placeholder="Enter Your Name"
              onChange={handleInput}
              value={userinfo.name}
            ></input>
            <input
              type="number"
              className="form-control mt-3"
              name="mobile"
              placeholder="Enter Your mobile number"
              value={userinfo.mobile}
              onChange={handleInput}
            ></input>
            <input
              type="email"
              className="form-control mt-3"
              name="email"
              placeholder="Enter Your email-id"
              value={userinfo.email}
              onChange={handleInput}
            ></input>
            <input
              type="pasword"
              className="form-control mt-3"
              name="password"
              placeholder="Enter Your password"
              value={userinfo.password}
              onChange={handleInput}
            ></input>
            <button className="btn btn-outline-primary mt-3 sign-btn">Signup</button>
          </form>
        </div>
      </>
    );
  }