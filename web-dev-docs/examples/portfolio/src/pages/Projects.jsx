const Projects = () => {
  // 项目数据
  const projects = [
    {
      id: 1,
      title: "Project Title 1",
      description: "A comprehensive description of the project, including its purpose, features, and technologies used.",
      technologies: ["React", "Tailwind CSS", "Vite"],
      image: "Project Image 1"
    },
    {
      id: 2,
      title: "Project Title 2",
      description: "A comprehensive description of the project, including its purpose, features, and technologies used.",
      technologies: ["Vue", "Bootstrap", "Webpack"],
      image: "Project Image 2"
    },
    {
      id: 3,
      title: "Project Title 3",
      description: "A comprehensive description of the project, including its purpose, features, and technologies used.",
      technologies: ["React", "Material UI", "Node.js"],
      image: "Project Image 3"
    },
    {
      id: 4,
      title: "Project Title 4",
      description: "A comprehensive description of the project, including its purpose, features, and technologies used.",
      technologies: ["Angular", "Tailwind CSS", "Firebase"],
      image: "Project Image 4"
    },
    {
      id: 5,
      title: "Project Title 5",
      description: "A comprehensive description of the project, including its purpose, features, and technologies used.",
      technologies: ["React", "Tailwind CSS", "Express"],
      image: "Project Image 5"
    },
    {
      id: 6,
      title: "Project Title 6",
      description: "A comprehensive description of the project, including its purpose, features, and technologies used.",
      technologies: ["Svelte", "Tailwind CSS", "Vite"],
      image: "Project Image 6"
    }
  ];

  return (
    <div className="pt-16">
      {/* Projects Section */}
      <section className="section bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Projects</h1>
          <p className="text-gray-600 mb-12">
            A collection of my recent projects, showcasing my skills and expertise.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <div key={project.id} className="project-card card">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">{project.image}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                  <p className="text-gray-600 mb-4">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech, index) => (
                      <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <button className="text-primary hover:underline">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Projects;