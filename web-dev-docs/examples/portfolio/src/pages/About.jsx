const About = () => {
  // 经验数据
  const experiences = [
    {
      id: 1,
      title: "Senior Web Developer",
      company: "Tech Company Inc.",
      period: "2020 - Present",
      description: "Developed and maintained modern web applications using React, Node.js, and various frontend frameworks. Led a team of developers and collaborated with designers to create user-friendly interfaces."
    },
    {
      id: 2,
      title: "Web Developer",
      company: "Digital Agency",
      period: "2018 - 2020",
      description: "Built responsive websites and web applications for clients across different industries. Worked with HTML, CSS, JavaScript, and WordPress."
    },
    {
      id: 3,
      title: "Frontend Developer Intern",
      company: "Start-up Company",
      period: "2017 - 2018",
      description: "Assisted in the development of frontend components and features. Learned modern frontend technologies and best practices."
    }
  ];

  // 教育数据
  const education = [
    {
      id: 1,
      degree: "Bachelor of Science in Computer Science",
      institution: "University of Technology",
      period: "2013 - 2017",
      description: "Focused on software development, web technologies, and computer science fundamentals."
    },
    {
      id: 2,
      degree: "Web Development Certificate",
      institution: "Online Learning Platform",
      period: "2016",
      description: "Completed a comprehensive web development program covering HTML, CSS, JavaScript, and frontend frameworks."
    }
  ];

  return (
    <div className="pt-16">
      {/* About Section */}
      <section className="section bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">About Me</h1>
          <p className="text-gray-600 mb-12">
            Learn more about my background, experience, and skills.
          </p>
          
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/3">
              <div className="h-80 bg-gray-200 rounded-xl mb-6 flex items-center justify-center">
                <span className="text-gray-500">Profile Image</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">[Your Name]</h2>
              <p className="text-primary mb-4">Web Developer</p>
              <p className="text-gray-600 mb-6">
                A passionate web developer with over 5 years of experience creating modern, responsive websites and applications. I specialize in React, Tailwind CSS, and Node.js, and I'm passionate about creating intuitive, user-friendly interfaces.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold">Email</h3>
                  <p className="text-gray-600">example@example.com</p>
                </div>
                <div>
                  <h3 className="font-bold">Phone</h3>
                  <p className="text-gray-600">(123) 456-7890</p>
                </div>
                <div>
                  <h3 className="font-bold">Location</h3>
                  <p className="text-gray-600">City, Country</p>
                </div>
              </div>
            </div>
            
            <div className="md:w-2/3">
              {/* Experience */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Experience</h2>
                <div className="space-y-8">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="border-l-4 border-primary pl-6 py-2">
                      <h3 className="text-xl font-bold">{exp.title}</h3>
                      <p className="text-primary mb-2">{exp.company} | {exp.period}</p>
                      <p className="text-gray-600">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Education */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Education</h2>
                <div className="space-y-8">
                  {education.map((edu) => (
                    <div key={edu.id} className="border-l-4 border-secondary pl-6 py-2">
                      <h3 className="text-xl font-bold">{edu.degree}</h3>
                      <p className="text-secondary mb-2">{edu.institution} | {edu.period}</p>
                      <p className="text-gray-600">{edu.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="section bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            My Skills
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Technical Skills */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-4">Technical Skills</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">React</span>
                    <span>95%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">JavaScript</span>
                    <span>90%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Tailwind CSS</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Node.js</span>
                    <span>80%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Git</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Soft Skills */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-4">Soft Skills</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Problem Solving</span>
                    <span>90%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Communication</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Teamwork</span>
                    <span>95%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Time Management</span>
                    <span>80%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Creativity</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;