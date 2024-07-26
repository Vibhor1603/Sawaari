

export default function Footer() {
    return (
        <footer className="bg-dark text-white mt-5 pt-20 p-3 text-center">
            <div className="container">
                <p className="mb-1">&copy; 2024 Sawaari. All rights reserved.</p>
                <nav>
                    <ul className="list-inline">
                        <li className="list-inline-item">
                            <a href="#" className="btn btn-warning text-black">
                                <i className="fab fa-instagram"></i> Instagram
                            </a>
                        </li>
                        <li className="list-inline-item">
                            <a href="#" className="btn btn-warning text-black">
                                <i className="fab fa-twitter"></i> Twitter
                            </a>
                        </li>
                        <li className="list-inline-item">
                            <a href="#" className="btn btn-warning text-black">
                                <i className="fas fa-envelope"></i> Gmail
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
