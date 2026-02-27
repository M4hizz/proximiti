import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { businesses as staticBusinesses } from "@/lib/businesses";
import type { Business } from "@/lib/businesses";
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  formatDiscount,
  isCouponValid,
  isExpiringSoon,
  type Coupon,
  type CreateCouponData,
} from "@/lib/couponApi";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Clock,
  AlertCircle,
  Search,
  X,
} from "lucide-react";

interface CouponManagementProps {
  isOpen: boolean;
  onClose: () => void;
  businesses?: Business[];
}

export function CouponManagement({
  isOpen,
  onClose,
  businesses = [],
}: CouponManagementProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Filter bar – independent business selection (for listing coupons)
  const [filterBusinessId, setFilterBusinessId] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterBusinessName, setFilterBusinessName] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  // Form – independent business selection (for creating/editing)
  const [formBusinessId, setFormBusinessId] = useState("");
  const [formBusinessQuery, setFormBusinessQuery] = useState("");
  const [showFormDropdown, setShowFormDropdown] = useState(false);
  const [formBusinessName, setFormBusinessName] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  // Derive filtered lists synchronously from the businesses prop
  const filterResults = businesses.filter(
    (b) =>
      !filterQuery.trim() ||
      b.name.toLowerCase().includes(filterQuery.trim().toLowerCase()) ||
      (b.address ?? "")
        .toLowerCase()
        .includes(filterQuery.trim().toLowerCase()),
  );

  const formBusinessResults = businesses.filter(
    (b) =>
      !formBusinessQuery.trim() ||
      b.name.toLowerCase().includes(formBusinessQuery.trim().toLowerCase()) ||
      (b.address ?? "")
        .toLowerCase()
        .includes(formBusinessQuery.trim().toLowerCase()),
  );

  // Name lookup for coupon list: passed businesses first, then static fallback
  const getBusinessName = (id: string) =>
    businesses.find((b) => b.id === id)?.name ||
    staticBusinesses.find((b) => b.id === id)?.name ||
    id;

  // Form state
  const [formData, setFormData] = useState<CreateCouponData>({
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 0,
    couponCode: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    usageLimit: undefined,
    isPremiumOnly: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchCoupons();
    }
  }, [isOpen, filterBusinessId]);

  // Clear search state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFilterQuery("");
      setFilterBusinessName("");
      setFilterBusinessId("");
    }
  }, [isOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowFormDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /** Fetch real businesses: nearby (empty query) or text search */
  const handleFilterSearch = (q: string) => {
    setFilterQuery(q);
    setShowFilterDropdown(true);
  };

  const handleFormSearch = (q: string) => {
    setFormBusinessQuery(q);
    setShowFormDropdown(true);
  };

  const selectFilterBusiness = (b: Business) => {
    setFilterBusinessId(b.id);
    setFilterBusinessName(b.name);
    setFilterQuery(b.name);
    setShowFilterDropdown(false);
  };

  const clearFilter = () => {
    setFilterBusinessId("");
    setFilterBusinessName("");
    setFilterQuery("");
    setShowFilterDropdown(false);
  };

  const selectFormBusiness = (b: Business) => {
    setFormBusinessId(b.id);
    setFormBusinessName(b.name);
    setFormBusinessQuery(b.name);
    setShowFormDropdown(false);
  };

  const clearFormBusiness = () => {
    setFormBusinessId("");
    setFormBusinessName("");
    setFormBusinessQuery("");
    setShowFormDropdown(false);
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAllCoupons(filterBusinessId || undefined);
      setCoupons(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusinessId) {
      setError("Please select a business");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, formData);
      } else {
        await createCoupon(formBusinessId, formData);
      }

      await fetchCoupons();
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormBusinessId(coupon.businessId);
    const name = getBusinessName(coupon.businessId);
    setFormBusinessName(name);
    setFormBusinessQuery(name);
    setFormData({
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      couponCode: coupon.couponCode,
      startDate: coupon.startDate.split("T")[0],
      endDate: coupon.endDate.split("T")[0],
      usageLimit: coupon.usageLimit ?? undefined,
      isPremiumOnly: coupon.isPremiumOnly,
    });
    setShowForm(true);
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      setLoading(true);
      setError("");
      await deleteCoupon(couponId);
      await fetchCoupons();
    } catch (err: any) {
      setError(err.message || "Failed to delete coupon");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      setLoading(true);
      setError("");
      await updateCoupon(coupon.id, { isActive: !coupon.isActive });
      await fetchCoupons();
    } catch (err: any) {
      setError(err.message || "Failed to update coupon");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setFormBusinessId("");
    setFormBusinessName("");
    setFormBusinessQuery("");
    setFormData({
      title: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      couponCode: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      usageLimit: undefined,
      isPremiumOnly: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Coupon Management
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!showForm && (
                <Button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="bg-cherry-rose hover:bg-green-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Coupon
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-gray-700 dark:text-gray-300 shrink-0">
              Filter by Business:
            </Label>
            <div ref={filterRef} className="relative min-w-65">
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-hidden">
                <Search className="w-4 h-4 ml-3 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => handleFilterSearch(e.target.value)}
                  onFocus={() => {
                    setShowFilterDropdown(true);
                  }}
                  placeholder="Search businesses…"
                  className="flex-1 px-3 py-2 bg-transparent text-gray-900 dark:text-white text-sm outline-none"
                />
                {filterQuery && (
                  <button
                    onClick={clearFilter}
                    className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showFilterDropdown && filterResults.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl text-sm">
                  <li>
                    <button
                      type="button"
                      onClick={clearFilter}
                      className="w-full text-left px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 italic"
                    >
                      All Businesses
                    </button>
                  </li>
                  {filterResults.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => selectFilterBusiness(b)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          filterBusinessId === b.id
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        <span className="block truncate">{b.name}</span>
                        {b.address && (
                          <span className="block text-xs text-gray-400 truncate mt-0.5">
                            {b.address}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {filterBusinessName && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing:{" "}
                <strong className="text-gray-900 dark:text-white">
                  {filterBusinessName}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="business">Business *</Label>
                  {editingCoupon ? (
                    <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm opacity-70">
                      {formBusinessName || formBusinessId}
                    </div>
                  ) : (
                    <div ref={formRef} className="relative">
                      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 overflow-hidden">
                        <Search className="w-4 h-4 ml-3 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={formBusinessQuery}
                          onChange={(e) => handleFormSearch(e.target.value)}
                          onFocus={() => {
                            setShowFormDropdown(true);
                          }}
                          placeholder="Search and select a business…"
                          className="flex-1 px-3 py-2 bg-transparent text-gray-900 dark:text-white text-sm outline-none"
                          required={!formBusinessId}
                        />
                        {formBusinessQuery && (
                          <button
                            onClick={clearFormBusiness}
                            className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {showFormDropdown && formBusinessResults.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl text-sm">
                          {formBusinessResults.map((b) => (
                            <li key={b.id}>
                              <button
                                type="button"
                                onClick={() => selectFormBusiness(b)}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                  formBusinessId === b.id
                                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                <span className="block truncate">{b.name}</span>
                                {b.address && (
                                  <span className="block text-xs text-gray-400 truncate mt-0.5">
                                    {b.address}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {formBusinessId && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                          ✓ Selected: {formBusinessName || formBusinessId}
                        </p>
                      )}
                      {!formBusinessId &&
                        formBusinessQuery.length > 0 &&
                        formBusinessResults.length === 0 && (
                          <p className="mt-1 text-xs text-gray-400">
                            No businesses found. Try a different search.
                          </p>
                        )}
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="e.g., Summer Special"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                    placeholder="Describe the offer..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="discountType">Discount Type *</Label>
                  <select
                    id="discountType"
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as "percentage" | "fixed",
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="discountValue">
                    Discount Value * (
                    {formData.discountType === "percentage" ? "%" : "$"})
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    max={
                      formData.discountType === "percentage" ? "100" : undefined
                    }
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="couponCode">Coupon Code *</Label>
                  <Input
                    id="couponCode"
                    value={formData.couponCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        couponCode: e.target.value.toUpperCase(),
                      })
                    }
                    required
                    placeholder="e.g., SUMMER20"
                    disabled={!!editingCoupon}
                  />
                </div>

                <div>
                  <Label htmlFor="usageLimit">Usage Limit (optional)</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="1"
                    value={formData.usageLimit ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usageLimit: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Unlimited"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="isPremiumOnly"
                    type="checkbox"
                    checked={formData.isPremiumOnly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isPremiumOnly: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-cherry-rose focus:ring-cherry-rose"
                  />
                  <Label htmlFor="isPremiumOnly" className="cursor-pointer">
                    Premium Members Only
                  </Label>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-cherry-rose hover:bg-green-600 text-white"
                >
                  {loading
                    ? "Saving..."
                    : editingCoupon
                      ? "Update Coupon"
                      : "Create Coupon"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {loading && coupons.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading coupons...
                </div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No coupons found. Create one to get started!
                </div>
              ) : (
                coupons.map((coupon) => {
                  const businessName = getBusinessName(coupon.businessId);
                  const valid = isCouponValid(coupon);
                  const expiringSoon = isExpiringSoon(coupon);

                  return (
                    <div
                      key={coupon.id}
                      className={`p-4 rounded-lg border ${
                        !coupon.isActive || !valid
                          ? "bg-gray-50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 opacity-60"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {coupon.title}
                            </h4>
                            <span className="px-2 py-0.5 bg-cherry-rose text-white text-xs font-bold rounded">
                              {formatDiscount(coupon)}
                            </span>
                            {expiringSoon && valid && coupon.isActive && (
                              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expiring Soon
                              </span>
                            )}
                            {!coupon.isActive && (
                              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                                Inactive
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {businessName}
                          </p>

                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            {coupon.description}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              Code: <strong>{coupon.couponCode}</strong>
                            </span>
                            <span>
                              Used: {coupon.usageCount}
                              {coupon.usageLimit
                                ? ` / ${coupon.usageLimit}`
                                : ""}
                            </span>
                            <span>
                              Expires:{" "}
                              {new Date(coupon.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(coupon)}
                            disabled={loading}
                            className={
                              coupon.isActive
                                ? "border-gray-300 dark:border-gray-600"
                                : "border-green-500 text-green-600 dark:text-green-400"
                            }
                          >
                            {coupon.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(coupon)}
                            disabled={loading}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(coupon.id)}
                            disabled={loading}
                            className="border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
