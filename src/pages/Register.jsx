import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Input from '../components/Input';
import Button from '../components/Button';
import Notice from '../components/Notice';
import PhotoPicker from '../components/PhotoPicker';
import { validatePhone, validateDob } from '../lib/validators';
import { friendlyError } from '../lib/errors';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [photoData, setPhotoData] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = 'Full name is required (up to 40 characters).';
    } else if (form.name.trim().length > 40) {
      errors.name = 'Full name must be at most 40 characters.';
    }

    if (!form.email.trim()) {
      errors.email = 'Email address is required.';
    }

    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.phone = phoneErr;

    const dobErr = validateDob(form.dob);
    if (dobErr) errors.dob = dobErr;

    if (!form.password || form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setGeneralError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      const createdUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(createdUser, {
        displayName: form.name.trim(),
      });

      // Create Firestore user document
      await setDoc(doc(db, 'users', createdUser.uid), {
        displayName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dob: form.dob,
        photoData: photoData || '',
        role: 'user',
        disabled: false,
        createdAt: serverTimestamp(),
      });

      addToast('Account created successfully! Welcome to Bidly.', 'success');
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setGeneralError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-sm">
            B
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create an account
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Join Bidly to start bidding and listing items today
          </p>
        </div>

        {generalError && (
          <Notice type="error" className="mb-6">
            {generalError}
          </Notice>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Profile Photo Picker */}
          <div className="flex flex-col items-center justify-center mb-2">
            <PhotoPicker
              value={photoData}
              onChange={setPhotoData}
              name={form.name}
              size="lg"
            />
            <span className="text-[11px] text-slate-400 mt-1">Profile photo (optional, auto-resized)</span>
          </div>

          <Input
            label="Full name"
            id="name"
            type="text"
            placeholder="Jane Doe"
            value={form.name}
            onChange={updateField('name')}
            error={fieldErrors.name}
            required
          />

          <Input
            label="Email address"
            id="email"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={updateField('email')}
            error={fieldErrors.email}
            required
          />

          <Input
            label="Mobile number"
            id="phone"
            type="tel"
            placeholder="+94 77 123 4567"
            value={form.phone}
            onChange={updateField('phone')}
            error={fieldErrors.phone}
            helper="Include country code, e.g. +94"
            required
          />

          <Input
            label="Date of birth"
            id="dob"
            type="date"
            value={form.dob}
            onChange={updateField('dob')}
            error={fieldErrors.dob}
            required
          />

          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={updateField('password')}
            error={fieldErrors.password}
            required
          />

          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="w-full shadow-md mt-4"
          >
            {submitting ? 'Creating account…' : 'Complete Registration'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-indigo-600 hover:text-indigo-800 transition"
            >
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
