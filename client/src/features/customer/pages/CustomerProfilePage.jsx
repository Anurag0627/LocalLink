import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Check, MapPin, Pencil, Plus, Star, Trash2, UserRound, X } from 'lucide-react';
import Alert from '../../../components/common/Alert.jsx';
import { LoadingState, ErrorState } from '../components/StateViews.jsx';
import {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  getCustomerProfile,
  setCustomerDefaultAddress,
  updateCustomerAddress,
  updateCustomerProfile,
} from '../services/customer.service.js';
import {
  customerAddressSchema,
  customerProfileSchema,
  emptyCustomerAddress,
} from '../schemas/customerProfile.schema.js';
import { useAuth } from '../../auth/context/useAuth.js';

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

function TextField({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        id={id}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
      />
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}

function AddressField({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        id={id}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
      />
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}

function addressFormValues(address) {
  return {
    label: address.label,
    fullAddress: address.fullAddress,
    street: address.street,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function fetchCustomerData() {
  return Promise.all([
    getCustomerProfile(),
    getCustomerAddresses(),
  ]);
}

export default function CustomerProfilePage() {
  const { updateUser } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [success, setSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isDirty: profileIsDirty },
  } = useForm({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', profileImage: '' },
  });
  const {
    register: registerAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddress,
    formState: { errors: addressErrors, isDirty: addressIsDirty },
  } = useForm({
    resolver: zodResolver(customerAddressSchema),
    defaultValues: emptyCustomerAddress,
  });

  const applyLoadedData = useCallback(([profileResponse, addressResponse]) => {
    const profileData = profileResponse.data.data;
    const addressData = addressResponse.data.data;
    const nextCustomer = {
      user: profileData.user,
      profile: profileData.profile,
    };
    setCustomer(nextCustomer);
    resetProfile({
      firstName: nextCustomer.user.firstName || '',
      lastName: nextCustomer.user.lastName || '',
      phone: nextCustomer.user.phone || '',
      profileImage: nextCustomer.profile.profileImage || '',
    });
    setAddresses(addressData.addresses || []);
    setDefaultAddressId(addressData.defaultAddressId || null);
  }, [resetProfile]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      applyLoadedData(await fetchCustomerData());
    } catch (requestError) {
      setLoadError(requestError);
    } finally {
      setLoading(false);
    }
  }, [applyLoadedData]);

  useEffect(() => {
    let active = true;
    fetchCustomerData()
      .then((data) => {
        if (active) applyLoadedData(data);
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [applyLoadedData]);

  useEffect(() => {
    if (!profileIsDirty && !addressIsDirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [profileIsDirty, addressIsDirty]);

  const submitProfile = async (values) => {
    setActionError(null);
    setSuccess('');
    setSavingProfile(true);
    try {
      const response = await updateCustomerProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone.trim() || null,
        profileImage: values.profileImage.trim() || null,
      });
      const nextCustomer = response.data.data;
      setCustomer(nextCustomer);
      resetProfile({
        firstName: nextCustomer.user.firstName || '',
        lastName: nextCustomer.user.lastName || '',
        phone: nextCustomer.user.phone || '',
        profileImage: nextCustomer.profile.profileImage || '',
      });
      updateUser({
        firstName: nextCustomer.user.firstName,
        lastName: nextCustomer.user.lastName,
        phone: nextCustomer.user.phone,
      });
      setSuccess('Your personal information has been updated.');
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setSavingProfile(false);
    }
  };

  const finishAddressMutation = (data, addressId) => {
    const nextDefaultId = Object.hasOwn(data, 'defaultAddressId')
      ? data.defaultAddressId
      : defaultAddressId;
    setDefaultAddressId(nextDefaultId || null);
    if (Array.isArray(data.addresses)) {
      setAddresses(data.addresses);
      return;
    }
    if (!data.address) return;
    setAddresses((current) => {
      const found = current.some((address) => address._id === addressId);
      const next = found
        ? current.map((address) => (address._id === addressId ? data.address : address))
        : [...current, data.address];
      return next.map((address) => ({
        ...address,
        isDefault: address._id === nextDefaultId,
      }));
    });
  };

  const submitAddress = async (values) => {
    setActionError(null);
    setSuccess('');
    setSavingAddress(true);
    try {
      const response = editingAddressId
        ? await updateCustomerAddress(editingAddressId, values)
        : await addCustomerAddress(values);
      const data = response.data.data;
      finishAddressMutation(data, editingAddressId || data.address?._id);
      setAddressFormOpen(false);
      setEditingAddressId(null);
      resetAddress(emptyCustomerAddress);
      setSuccess(editingAddressId ? 'Address updated.' : 'Address added.');
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setSavingAddress(false);
    }
  };

  const startAddingAddress = () => {
    setActionError(null);
    setSuccess('');
    setEditingAddressId(null);
    resetAddress(emptyCustomerAddress);
    setAddressFormOpen(true);
  };

  const startEditingAddress = (address) => {
    setActionError(null);
    setSuccess('');
    setEditingAddressId(address._id);
    resetAddress(addressFormValues(address));
    setAddressFormOpen(true);
  };

  const cancelAddressForm = () => {
    if (addressIsDirty && !window.confirm('Discard your unsaved address changes?')) return;
    setAddressFormOpen(false);
    setEditingAddressId(null);
    resetAddress(emptyCustomerAddress);
  };

  const chooseDefaultAddress = async (addressId) => {
    setActionError(null);
    setSuccess('');
    setSavingAddress(true);
    try {
      const response = await setCustomerDefaultAddress(addressId);
      finishAddressMutation(response.data.data, addressId);
      setSuccess('Default address updated.');
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setSavingAddress(false);
    }
  };

  const removeAddress = async (address) => {
    if (!window.confirm(`Delete the ${address.label.toLowerCase()} address?`)) return;
    setActionError(null);
    setSuccess('');
    setSavingAddress(true);
    try {
      const response = await deleteCustomerAddress(address._id);
      finishAddressMutation(response.data.data, address._id);
      setSuccess('Address deleted.');
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setSavingAddress(false);
    }
  };

  const discardProfileChanges = () => {
    if (!window.confirm('Discard your unsaved profile changes?')) return;
    if (!customer) return;
    resetProfile({
      firstName: customer.user.firstName || '',
      lastName: customer.user.lastName || '',
      phone: customer.user.phone || '',
      profileImage: customer.profile.profileImage || '',
    });
  };

  if (loading) return <LoadingState label="Loading your profile..." />;
  if (loadError && !customer) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <ErrorState error={loadError} onRetry={() => void loadData()} />
      </section>
    );
  }
  if (!customer) return null;

  const selectedDefaultId = defaultAddressId
    || addresses.find((address) => address.isDefault)?._id
    || null;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-semibold text-indigo-600">Account settings</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-2 text-sm text-slate-600">Manage your personal information and saved addresses.</p>
        </div>
        {customer.profile.profileImage && (
          <img
            src={customer.profile.profileImage}
            alt=""
            className="h-16 w-16 rounded-full border border-slate-200 object-cover"
          />
        )}
      </div>

      {actionError && <div className="mt-6"><Alert>{actionError.message}</Alert></div>}
      {loadError && customer && <div className="mt-6"><Alert>{loadError.message}</Alert></div>}
      {success && <div className="mt-6"><Alert type="success">{success}</Alert></div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><UserRound size={20} /></span>
            <div>
              <h2 className="font-bold text-slate-900">Personal information</h2>
              <p className="text-sm text-slate-500">Update the details on your customer account.</p>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit(submitProfile)} noValidate className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="customer-first-name" label="First name" autoComplete="given-name" {...registerProfile('firstName')} error={profileErrors.firstName} />
              <TextField id="customer-last-name" label="Last name" autoComplete="family-name" {...registerProfile('lastName')} error={profileErrors.lastName} />
            </div>
            <TextField id="customer-email" label="Email address" type="email" autoComplete="email" value={customer.user.email || ''} readOnly />
            <TextField id="customer-phone" label="Phone number" type="tel" autoComplete="tel" {...registerProfile('phone')} error={profileErrors.phone} />
            <TextField id="customer-profile-image" label="Profile image URL (optional)" type="url" placeholder="https://" {...registerProfile('profileImage')} error={profileErrors.profileImage} />
            <div className="flex flex-wrap gap-3 pt-1">
              <button type="submit" disabled={savingProfile || !profileIsDirty} className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
              {profileIsDirty && (
                <button type="button" onClick={discardProfileChanges} disabled={savingProfile} className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
                  Discard changes
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><MapPin size={20} /></span>
              <div>
                <h2 className="font-bold text-slate-900">Saved addresses</h2>
                <p className="text-sm text-slate-500">Manage where your services can take place.</p>
              </div>
            </div>
            {!addressFormOpen && (
              <button type="button" onClick={startAddingAddress} className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>
                <Plus size={17} /> Add address
              </button>
            )}
          </div>

          {addressFormOpen && (
            <form onSubmit={handleAddressSubmit(submitAddress)} noValidate className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">{editingAddressId ? 'Edit address' : 'Add an address'}</h3>
                <button type="button" onClick={cancelAddressForm} aria-label="Close address form" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="address-label" className="mb-1 block text-sm font-semibold text-slate-700">Address label</label>
                  <select
                    id="address-label"
                    {...registerAddress('label')}
                    aria-invalid={Boolean(addressErrors.label)}
                    aria-describedby={addressErrors.label ? 'address-label-error' : undefined}
                    className={inputClass}
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                  {addressErrors.label && <p id="address-label-error" className="mt-1.5 text-sm text-red-600">{addressErrors.label.message}</p>}
                </div>
                <AddressField id="address-full" label="Full address" autoComplete="street-address" {...registerAddress('fullAddress')} error={addressErrors.fullAddress} />
                <AddressField id="address-street" label="Street" autoComplete="address-line1" {...registerAddress('street')} error={addressErrors.street} />
                <AddressField id="address-city" label="City" autoComplete="address-level2" {...registerAddress('city')} error={addressErrors.city} />
                <AddressField id="address-state" label="State / region" autoComplete="address-level1" {...registerAddress('state')} error={addressErrors.state} />
                <AddressField id="address-postal-code" label="Postal code" autoComplete="postal-code" {...registerAddress('postalCode')} error={addressErrors.postalCode} />
                <div className="sm:col-span-2">
                  <AddressField id="address-country" label="Country" autoComplete="country-name" {...registerAddress('country')} error={addressErrors.country} />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={savingAddress} className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>
                  {savingAddress ? 'Saving...' : editingAddressId ? 'Save address' : 'Add address'}
                </button>
                <button type="button" onClick={cancelAddressForm} disabled={savingAddress} className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-white`}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {addresses.length === 0 && !addressFormOpen ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <MapPin className="mx-auto text-slate-400" size={24} />
              <p className="mt-3 font-semibold text-slate-800">No saved addresses yet</p>
              <p className="mt-1 text-sm text-slate-500">Add an address to make booking local services easier.</p>
            </div>
          ) : addresses.length > 0 && (
            <ul className="mt-6 space-y-3">
              {addresses.map((address) => {
                const isDefault = address._id === selectedDefaultId || address.isDefault;
                return (
                  <li key={address._id} className={`rounded-xl border p-4 ${isDefault ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{address.label}</h3>
                          {isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700"><Star size={12} fill="currentColor" /> Default</span>}
                        </div>
                        <p className="mt-2 break-words text-sm text-slate-700">{address.fullAddress}</p>
                        <p className="mt-1 text-sm text-slate-500">{address.city}, {address.state} {address.postalCode}</p>
                        <p className="text-sm text-slate-500">{address.country}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {!isDefault && (
                          <button type="button" onClick={() => void chooseDefaultAddress(address._id)} disabled={savingAddress || addressFormOpen} className={`${buttonClass} border border-indigo-200 text-indigo-700 hover:bg-indigo-50`}>
                            <Check size={16} /> Set default
                          </button>
                        )}
                        <button type="button" onClick={() => startEditingAddress(address)} disabled={savingAddress || addressFormOpen} aria-label={`Edit ${address.label} address`} className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
                          <Pencil size={16} /> Edit
                        </button>
                        <button type="button" onClick={() => void removeAddress(address)} disabled={savingAddress || addressFormOpen} aria-label={`Delete ${address.label} address`} className={`${buttonClass} border border-red-200 text-red-700 hover:bg-red-50`}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
