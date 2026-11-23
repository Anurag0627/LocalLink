import Booking from '../models/booking.model.js';
import CustomerProfile from '../models/customerProfile.model.js';
import ProviderProfile from '../models/providerProfile.model.js';
import Review from '../models/review.model.js';
import ReviewReport from '../models/reviewReport.model.js';
import Service from '../models/service.model.js';
import User from '../models/user.model.js';
import Category from '../models/category.model.js';

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function getDashboard() {
  const [
    totalCustomers,
    totalProviders,
    verifiedProviders,
    pendingProviders,
    activeServices,
    totalBookings,
    pendingBookings,
    completedBookings,
    publishedReviews,
    pendingReports,
    recentCustomers,
    recentBookings,
    recentProviders,
    recentReports,
  ] = await Promise.all([
    User.countDocuments({ role: 'CUSTOMER' }),
    User.countDocuments({ role: 'PROVIDER' }),
    ProviderProfile.countDocuments({ verificationStatus: 'VERIFIED' }),
    ProviderProfile.countDocuments({ verificationStatus: 'PENDING' }),
    Service.countDocuments({ isActive: true }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'PENDING' }),
    Booking.countDocuments({ status: 'COMPLETED' }),
    Review.countDocuments({ status: 'PUBLISHED', deletedAt: null }),
    Review.countDocuments({ reportCount: { $gt: 0 }, deletedAt: null }),
    User.find({ role: 'CUSTOMER' }).sort({ createdAt: -1 }).limit(5).select('firstName lastName email status createdAt').lean(),
    Booking.find().sort({ createdAt: -1 }).limit(5)
      .populate({ path: 'customer', select: 'firstName lastName email' })
      .populate({ path: 'provider', select: 'businessName' })
      .populate({ path: 'service', select: 'title' }).lean(),
    ProviderProfile.find().sort({ createdAt: -1 }).limit(5)
      .populate({ path: 'user', select: 'firstName lastName email status createdAt' }).lean(),
    Review.find({ reportCount: { $gt: 0 }, deletedAt: null }).sort({ updatedAt: -1 }).limit(5)
      .populate({ path: 'customer', select: 'firstName lastName' })
      .populate({ path: 'provider', select: 'businessName' }).lean(),
  ]);
  return {
    statistics: {
      totalCustomers, totalProviders, verifiedProviders, pendingProviderVerifications: pendingProviders,
      totalActiveServices: activeServices, totalBookings, pendingBookings, completedBookings,
      publishedReviews, pendingReviewReports: pendingReports,
    },
    recent: { customers: recentCustomers, bookings: recentBookings, providers: recentProviders, reportedReviews: recentReports },
  };
}

export async function listCustomers({ page, limit, search, status, sortBy, order }) {
  const filter = { role: 'CUSTOMER' };
  if (status) filter.status = status;
  if (search) {
    const term = escaped(search);
    filter.$or = [
      { firstName: { $regex: term, $options: 'i' } },
      { lastName: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ];
  }
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    User.find(filter).select('firstName lastName email phone role status isEmailVerified createdAt lastLoginAt')
      .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getCustomer(customerId) {
  const user = await User.findOne({ _id: customerId, role: 'CUSTOMER' })
    .select('firstName lastName email phone role status isEmailVerified createdAt lastLoginAt').lean();
  if (!user) return null;
  const [profile, bookings, reviews] = await Promise.all([
    CustomerProfile.findOne({ user: customerId }).lean(),
    Booking.find({ customer: customerId }).sort({ createdAt: -1 }).limit(20)
      .populate({ path: 'provider', select: 'businessName' })
      .populate({ path: 'service', select: 'title' }).lean(),
    Review.find({ customer: customerId, deletedAt: null }).sort({ createdAt: -1 }).limit(20)
      .populate({ path: 'provider', select: 'businessName' })
      .populate({ path: 'service', select: 'title' }).lean(),
  ]);
  return { account: user, profile, bookings, reviews };
}

export function updateUserStatus(userId, status, role) {
  return User.findOneAndUpdate(
    { _id: userId, role },
    { $set: { status } },
    { returnDocument: 'after', runValidators: true },
  ).select('firstName lastName email role status createdAt');
}

export async function listProviders({ page, limit, search, verificationStatus, status, sortBy, order }) {
  const filter = {};
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  let userFilter = null;
  if (status || search) {
    userFilter = { role: 'PROVIDER' };
    if (status) userFilter.status = status;
    if (search) {
      const term = escaped(search);
      userFilter.$or = [
        { firstName: { $regex: term, $options: 'i' } },
        { lastName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }
  }
  if (search) filter.$or = [{ businessName: { $regex: escaped(search), $options: 'i' } }];
  if (userFilter) {
    const users = await User.find(userFilter).select('_id').lean();
    const userIds = users.map((item) => item._id);
    if (search) {
      const profileIds = await ProviderProfile.find({
        businessName: { $regex: escaped(search), $options: 'i' },
      }).select('user').lean();
      filter.user = { $in: [...new Set([...userIds, ...profileIds.map((p) => p.user)])] };
      delete filter.$or;
    } else {
      filter.user = { $in: userIds };
    }
  }
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    ProviderProfile.find(filter).populate({ path: 'user', select: 'firstName lastName email role status isEmailVerified createdAt lastLoginAt' })
      .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ProviderProfile.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getProvider(providerId) {
  const profile = await ProviderProfile.findById(providerId)
    .populate({ path: 'user', select: 'firstName lastName email phone role status isEmailVerified createdAt lastLoginAt' }).lean();
  if (!profile) return null;
  const [services, bookingStats, recentBookings] = await Promise.all([
    Service.find({ provider: providerId }).sort({ createdAt: -1 }).lean(),
    Booking.aggregate([
      { $match: { provider: profile._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Booking.find({ provider: providerId }).sort({ createdAt: -1 }).limit(20)
      .populate({ path: 'customer', select: 'firstName lastName email' })
      .populate({ path: 'service', select: 'title' }).lean(),
  ]);
  return { profile, services, bookingStats: Object.fromEntries(bookingStats.map((item) => [item._id, item.count])), recentBookings };
}

export function updateProviderVerification(providerId, verificationStatus, reason, userId) {
  const set = {
    verificationStatus,
  };
  if (reason) set.verificationReason = reason;
  set.verificationReviewedAt = new Date();
  set.verificationReviewedBy = userId;
  return ProviderProfile.findByIdAndUpdate(
    providerId,
    { $set: set },
    { returnDocument: 'after', runValidators: true },
  ).populate({ path: 'user', select: 'firstName lastName email status' });
}

export async function listServices({ page, limit, search, categoryId, providerId, isActive, sortBy, order }) {
  const filter = {};
  if (search) filter.title = { $regex: escaped(search), $options: 'i' };
  if (categoryId) filter.category = categoryId;
  if (providerId) filter.provider = providerId;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Service.find(filter).populate({ path: 'provider', select: 'businessName user verificationStatus' })
      .populate({ path: 'category', select: 'name slug isActive' })
      .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Service.countDocuments(filter),
  ]);
  return { items, total };
}

export function updateServiceStatus(serviceId, isActive) {
  return Service.findByIdAndUpdate(serviceId, { $set: { isActive } }, { returnDocument: 'after', runValidators: true });
}

export async function listBookings({ page, limit, search, status, customerId, providerId, startDate, endDate, sortBy, order }) {
  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customer = customerId;
  if (providerId) filter.provider = providerId;
  if (search) filter.bookingNumber = { $regex: escaped(search), $options: 'i' };
  if (startDate || endDate) {
    filter.scheduledDate = {};
    if (startDate) filter.scheduledDate.$gte = new Date(startDate);
    if (endDate) filter.scheduledDate.$lte = new Date(endDate);
  }
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Booking.find(filter).populate({ path: 'customer', select: 'firstName lastName email' })
      .populate({ path: 'provider', select: 'businessName' })
      .populate({ path: 'service', select: 'title' })
      .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  return { items, total };
}

export function getBooking(bookingId) {
  return Booking.findById(bookingId)
    .populate({ path: 'customer', select: 'firstName lastName email phone status' })
    .populate({ path: 'provider', select: 'businessName user verificationStatus' })
    .populate({ path: 'service', select: 'title category pricingType price' })
    .lean();
}

export async function listCategories({ page, limit, search, sortBy, order }) {
  const filter = {};
  if (search) filter.name = { $regex: escaped(search), $options: 'i' };
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Category.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);
  if (items.length) {
    const counts = await Service.aggregate([
      { $match: { category: { $in: items.map((item) => item._id) } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countById = new Map(counts.map((item) => [item._id.toString(), item.count]));
    return {
      items: items.map((item) => ({ ...item, serviceCount: countById.get(item._id.toString()) ?? 0 })),
      total,
    };
  }
  return { items, total };
}

export async function listReports({ page, limit, reason, sortBy, order }) {
  const filter = {};
  if (reason) filter.reason = reason;
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    ReviewReport.find(filter)
      .select('_id review reason description createdAt updatedAt')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'review', select: 'rating comment status reportCount moderationReason provider service customer' })
      .lean(),
    ReviewReport.countDocuments(filter),
  ]);
  return { items, total };
}
