import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/customer.service.js', () => ({
  addCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(),
  getCustomerAddresses: vi.fn(),
  getCustomerProfile: vi.fn(),
  setCustomerDefaultAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
  updateCustomerProfile: vi.fn(),
}));

vi.mock('../../auth/context/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../auth/context/useAuth.js';
import {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  getCustomerProfile,
  setCustomerDefaultAddress,
  updateCustomerAddress,
  updateCustomerProfile,
} from '../services/customer.service.js';
import CustomerProfilePage from './CustomerProfilePage.jsx';

const userData = {
  _id: 'customer-1',
  firstName: 'Taylor',
  lastName: 'Customer',
  email: 'taylor@example.com',
  phone: '5551234567',
};
const profileData = { user: userData, profile: { profileImage: '' } };
const homeAddress = {
  _id: 'address-1',
  label: 'Home',
  fullAddress: '10 Main Street',
  street: 'Main Street',
  city: 'Springfield',
  state: 'CA',
  postalCode: '90210',
  country: 'USA',
  isDefault: true,
};
const workAddress = {
  ...homeAddress,
  _id: 'address-2',
  label: 'Work',
  fullAddress: '20 Market Street',
  street: 'Market Street',
  isDefault: false,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CustomerProfilePage />
    </MemoryRouter>,
  );
}

function mockProfile(profile = profileData) {
  getCustomerProfile.mockResolvedValue({ data: { data: profile } });
}

function mockAddresses(addresses = [homeAddress], defaultAddressId = 'address-1') {
  getCustomerAddresses.mockResolvedValue({
    data: { data: { addresses, defaultAddressId } },
  });
}

async function fillAddress(user, { city = 'Springfield' } = {}) {
  await user.selectOptions(screen.getByLabelText('Address label'), 'Home');
  await user.type(screen.getByLabelText('Full address'), '10 Main Street');
  await user.type(screen.getByLabelText('Street'), 'Main Street');
  await user.type(screen.getByLabelText('City'), city);
  await user.type(screen.getByLabelText('State / region'), 'CA');
  await user.type(screen.getByLabelText('Postal code'), '90210');
  await user.type(screen.getByLabelText('Country'), 'USA');
}

describe('CustomerProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ updateUser: vi.fn() });
    mockProfile();
    mockAddresses();
    addCustomerAddress.mockResolvedValue({
      data: { data: { address: homeAddress, defaultAddressId: 'address-1' } },
    });
    updateCustomerAddress.mockResolvedValue({
      data: { data: { address: homeAddress, defaultAddressId: 'address-1' } },
    });
    deleteCustomerAddress.mockResolvedValue({
      data: { data: { addresses: [], defaultAddressId: null } },
    });
    setCustomerDefaultAddress.mockResolvedValue({
      data: { data: { address: workAddress, defaultAddressId: 'address-2' } },
    });
    updateCustomerProfile.mockResolvedValue({ data: { data: profileData } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders fetched customer details and saved addresses', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Taylor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Customer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('taylor@example.com')).toHaveAttribute('readonly');
    expect(screen.getByText('10 Main Street')).toBeInTheDocument();
    expect(getCustomerProfile).toHaveBeenCalledOnce();
    expect(getCustomerAddresses).toHaveBeenCalledOnce();
  });

  it('shows a loading state while profile and address requests are pending', () => {
    getCustomerProfile.mockReturnValue(new Promise(() => {}));
    getCustomerAddresses.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your profile...');
  });

  it('shows the empty state when there are no saved addresses', async () => {
    mockAddresses([], null);
    renderPage();

    expect(await screen.findByText('No saved addresses yet')).toBeInTheDocument();
  });

  it('validates profile fields and saves supported customer details', async () => {
    const user = userEvent.setup();
    updateCustomerProfile.mockResolvedValue({
      data: {
        data: {
          user: { ...userData, firstName: 'Jordan', phone: null },
          profile: { profileImage: '' },
        },
      },
    });
    renderPage();

    const firstName = await screen.findByLabelText('First name');
    await user.clear(firstName);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter your first name.')).toBeInTheDocument();

    await user.type(firstName, 'Jordan');
    await user.clear(screen.getByLabelText('Phone number'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateCustomerProfile).toHaveBeenCalledWith({
      firstName: 'Jordan',
      lastName: 'Customer',
      phone: null,
      profileImage: null,
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your personal information has been updated.');
  });

  it('adds an address using the backend address fields', async () => {
    const user = userEvent.setup();
    mockAddresses([], null);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add address' }));
    await fillAddress(user);
    await user.click(screen.getByRole('button', { name: 'Add address' }));

    await waitFor(() => expect(addCustomerAddress).toHaveBeenCalledWith({
      label: 'Home',
      fullAddress: '10 Main Street',
      street: 'Main Street',
      city: 'Springfield',
      state: 'CA',
      postalCode: '90210',
      country: 'USA',
    }));
    expect(await screen.findByText('10 Main Street')).toBeInTheDocument();
  });

  it('edits an existing address', async () => {
    const user = userEvent.setup();
    const updatedAddress = { ...homeAddress, city: 'Oakland' };
    updateCustomerAddress.mockResolvedValue({
      data: { data: { address: updatedAddress, defaultAddressId: 'address-1' } },
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Edit Home address' }));
    const city = screen.getByLabelText('City');
    await user.clear(city);
    await user.type(city, 'Oakland');
    await user.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() => expect(updateCustomerAddress).toHaveBeenCalledWith('address-1', {
      label: 'Home',
      fullAddress: '10 Main Street',
      street: 'Main Street',
      city: 'Oakland',
      state: 'CA',
      postalCode: '90210',
      country: 'USA',
    }));
    expect(await screen.findByText('Oakland, CA 90210')).toBeInTheDocument();
  });

  it('asks before deleting an address and removes it after success', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Delete Home address' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete the home address?');
    expect(await screen.queryByText('10 Main Street')).not.toBeInTheDocument();
    expect(deleteCustomerAddress).toHaveBeenCalledWith('address-1');
  });

  it('sets the chosen address as the default', async () => {
    const user = userEvent.setup();
    mockAddresses([homeAddress, workAddress], 'address-1');
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Set default' }));

    expect(setCustomerDefaultAddress).toHaveBeenCalledWith('address-2');
    await waitFor(() => {
      const defaultBadges = screen.getAllByText('Default');
      expect(defaultBadges).toHaveLength(1);
      expect(screen.getByText('20 Market Street').closest('li')).toHaveTextContent('Default');
    });
  });

  it('shows API errors when saving profile information fails', async () => {
    const user = userEvent.setup();
    updateCustomerProfile.mockRejectedValue(new Error('Profile update failed.'));
    renderPage();
    await user.clear(await screen.findByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Morgan');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Profile update failed.');
  });

  it('shows a load error and allows retrying failed profile requests', async () => {
    getCustomerProfile.mockRejectedValueOnce(new Error('Profile unavailable.'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Profile unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(getCustomerProfile).toHaveBeenCalledTimes(2);
  });
});
