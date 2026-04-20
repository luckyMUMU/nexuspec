import { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 模拟表单提交
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      // 重置表单
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      // 3秒后重置成功状态
      setTimeout(() => setSubmitSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="pt-16">
      {/* Contact Section */}
      <section className="section bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Me</h1>
          <p className="text-gray-600 mb-12">
            Get in touch with me for any questions or collaboration opportunities.
          </p>
          
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/2">
              <h2 className="text-2xl font-bold mb-6">Send Me a Message</h2>
              
              {submitSuccess ? (
                <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6">
                  <p>Thank you for your message! I'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="Your email"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="Subject"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="textarea"
                      placeholder="Your message"
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
            
            <div className="md:w-1/2">
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-white p-3 rounded-full">
                    📧
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Email</h3>
                    <p className="text-gray-600">example@example.com</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-white p-3 rounded-full">
                    📞
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Phone</h3>
                    <p className="text-gray-600">(123) 456-7890</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-white p-3 rounded-full">
                    📍
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Location</h3>
                    <p className="text-gray-600">City, Country</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-12">
                <h3 className="font-bold text-lg mb-4">Social Media</h3>
                <div className="flex gap-4">
                  <a href="#" className="bg-gray-100 hover:bg-primary hover:text-white transition-colors p-3 rounded-full">
                    <span>🐦</span>
                  </a>
                  <a href="#" className="bg-gray-100 hover:bg-primary hover:text-white transition-colors p-3 rounded-full">
                    <span>👔</span>
                  </a>
                  <a href="#" className="bg-gray-100 hover:bg-primary hover:text-white transition-colors p-3 rounded-full">
                    <span>📘</span>
                  </a>
                  <a href="#" className="bg-gray-100 hover:bg-primary hover:text-white transition-colors p-3 rounded-full">
                    <span>📱</span>
                  </a>
                </div>
              </div>
              
              <div className="mt-12">
                <h3 className="font-bold text-lg mb-4">Working Hours</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>Monday - Friday: 9 AM - 6 PM</li>
                  <li>Saturday: 10 AM - 4 PM</li>
                  <li>Sunday: Closed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;