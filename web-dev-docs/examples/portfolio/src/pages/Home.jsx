import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero flex items-center justify-center text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Hi, I'm [Your Name]
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            A passionate web developer with expertise in creating modern, responsive websites and applications.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/projects" className="btn-primary">
              View My Work
            </Link>
            <Link to="/contact" className="btn-secondary">
              Contact Me
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="section bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            Featured Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Project 1 */}
            <div className="project-card card">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Project Image</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Project Title 1</h3>
                <p className="text-gray-600 mb-4">
                  A brief description of the project and its features.
                </p>
                <Link to="/projects" className="text-primary hover:underline">
                  View Details
                </Link>
              </div>
            </div>

            {/* Project 2 */}
            <div className="project-card card">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Project Image</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Project Title 2</h3>
                <p className="text-gray-600 mb-4">
                  A brief description of the project and its features.
                </p>
                <Link to="/projects" className="text-primary hover:underline">
                  View Details
                </Link>
              </div>
            </div>

            {/* Project 3 */}
            <div className="project-card card">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Project Image</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Project Title 3</h3>
                <p className="text-gray-600 mb-4">
                  A brief description of the project and its features.
                </p>
                <Link to="/projects" className="text-primary hover:underline">
                  View Details
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link to="/projects" className="btn-primary">
              View All Projects
            </Link>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="section bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            My Skills
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Skill 1 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">⚛️</span>
              </div>
              <h3 className="text-lg font-bold">React</h3>
              <p className="text-gray-600 mt-2">Frontend Library</p>
            </div>

            {/* Skill 2 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">🎨</span>
              </div>
              <h3 className="text-lg font-bold">Tailwind CSS</h3>
              <p className="text-gray-600 mt-2">CSS Framework</p>
            </div>

            {/* Skill 3 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">🚀</span>
              </div>
              <h3 className="text-lg font-bold">Vite</h3>
              <p className="text-gray-600 mt-2">Build Tool</p>
            </div>

            {/* Skill 4 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">📱</span>
              </div>
              <h3 className="text-lg font-bold">Responsive Design</h3>
              <p className="text-gray-600 mt-2">Mobile-First</p>
            </div>

            {/* Skill 5 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">💻</span>
              </div>
              <h3 className="text-lg font-bold">JavaScript</h3>
              <p className="text-gray-600 mt-2">Programming Language</p>
            </div>

            {/* Skill 6 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">🗄️</span>
              </div>
              <h3 className="text-lg font-bold">Node.js</h3>
              <p className="text-gray-600 mt-2">Backend Runtime</p>
            </div>

            {/* Skill 7 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">🔧</span>
              </div>
              <h3 className="text-lg font-bold">Git</h3>
              <p className="text-gray-600 mt-2">Version Control</p>
            </div>

            {/* Skill 8 */}
            <div className="skill-card bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-4xl mb-4">
                <span className="text-primary">📊</span>
              </div>
              <h3 className="text-lg font-bold">UI/UX Design</h3>
              <p className="text-gray-600 mt-2">User Experience</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                About Me
              </h2>
              <p className="text-gray-600 mb-4">
                I'm a web developer with over 5 years of experience creating modern, responsive websites and applications. I specialize in React, Tailwind CSS, and Node.js, and I'm passionate about creating intuitive, user-friendly interfaces.
              </p>
              <p className="text-gray-600 mb-6">
                I've worked with clients from various industries, helping them build their online presence and achieve their business goals. My approach combines technical expertise with creative problem-solving to deliver high-quality solutions.
              </p>
              <Link to="/about" className="btn-primary">
                Learn More About Me
              </Link>
            </div>
            <div className="md:w-1/2">
              <div className="h-80 bg-gray-200 rounded-xl flex items-center justify-center">
                <span className="text-gray-500">Profile Image</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Get In Touch
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            If you're interested in working with me or have any questions, feel free to reach out.
          </p>
          <Link to="/contact" className="btn-primary">
            Contact Me
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;