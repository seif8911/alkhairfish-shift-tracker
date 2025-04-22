import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { addEmployeeApi, uploadEmployeePhotoApi } from '../../utils/api';
import { Employee } from '../../types';

interface AddEmployeeProps {
  onAddEmployee: (employee: Employee) => void;
}

const AddEmployee: React.FC<AddEmployeeProps> = ({ onAddEmployee }) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !code.trim()) {
      setMessage({ text: 'All fields are required', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      let photoFilename: string | undefined = undefined;
      if (photoFile) {
        photoFilename = await uploadEmployeePhotoApi(photoFile);
      }
      const newEmployee = await addEmployeeApi({
        name: name.trim(),
        email: email.trim(),
        employeeCode: code.trim(),
        ...(photoFilename ? { photo: photoFilename } : {})
      });
      onAddEmployee(newEmployee);
      setMessage({ text: 'Employee added successfully', type: 'success' });
      setName('');
      setEmail('');
      setCode('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Failed to add employee', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-6 bg-emerald-600 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Add New Employee</h2>
          <UserPlus className="h-6 w-6" />
        </div>
        <p className="mt-2 text-sm opacity-80">
          Create a new employee record in the system
        </p>
      </div>
      
      <div className="px-6 py-6">
        {message && (
          <div 
            className={`mb-4 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
  <div className="mb-4">
    <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-2">
      Employee Photo
    </label>
    <input
      id="photo"
      type="file"
      accept="image/*"
      onChange={e => {
        const file = e.target.files?.[0] || null;
        setPhotoFile(file);
        setPhotoPreview(file ? URL.createObjectURL(file) : null);
      }}
      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      disabled={isSubmitting}
    />
    {photoPreview && (
      <img src={photoPreview} alt="Preview" className="mt-2 h-24 rounded object-cover border" />
    )}
  </div>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="John Doe"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="john.doe@example.com"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Employee Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="EMP001"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-gray-500">
              This code will be used by the employee to clock in and out
            </p>
          </div>
          
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            <UserPlus className="h-5 w-5" />
            <span>{isSubmitting ? 'Adding...' : 'Add Employee'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;