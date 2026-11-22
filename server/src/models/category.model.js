import mongoose, { Schema } from 'mongoose';
import { isValidHttpUrl, slugPattern, slugify } from './schemas/common.schemas.js';

const categorySchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      minlength: 2,
      maxlength: 100,
      unique: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      match: slugPattern,
      unique: true,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    icon: { type: String, trim: true, maxlength: 100 },
    image: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => value === undefined || isValidHttpUrl(value),
        message: 'Category image must be an HTTP or HTTPS URL',
      },
    },
    isActive: { type: Boolean, default: true },
    displayOrder: {
      type: Number,
      min: 0,
      validate: Number.isInteger,
      default: 0,
    },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function generateCategorySlug() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ isActive: 1, name: 1 });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
