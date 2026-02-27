import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import authApi, { type User } from "@/lib/authApi";
import {
  Users,
  Shield,
  AlertCircle,
  CheckCircle,
  Tag,
  XCircle,
  Crown,
} from "lucide-react";
import { CouponManagement } from "@/components/coupon-management";
import type { Business } from "@/lib/businesses";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  businesses?: Business[];
}

export function AdminPanel({
  isOpen,
  onClose,
  businesses = [],
}: AdminPanelProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCouponManagement, setShowCouponManagement] = useState(false);

  useEffect(() => {
    if (isOpen && user?.role === "admin") {
      fetchUsers();
    }
  }, [isOpen, user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authApi.getUsers();
      setUsers(response.users);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (userId: string) => {
    if (
      !confirm(
        "Cancel this user's subscription? This will immediately revoke their premium access.",
      )
    )
      return;
    try {
      await authApi.adminCancelUserSubscription(userId);
      await fetchUsers();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleRoleChange = async (
    userId: string,
    newRole: "user" | "admin",
  ) => {
    try {
      await authApi.updateUserRole(userId, newRole);
      await fetchUsers(); // Refresh the list
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (!isOpen) return null;

  if (user?.role !== "admin") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="bg-gray-800 border-gray-700 p-6 max-w-md mx-4">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Access Denied</h2>
          </div>
          <p className="text-gray-300 mb-4">
            You don't have permission to access the admin panel. Admin
            privileges are required.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">
                User Management
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((userData) => (
                  <div
                    key={userData.id}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {userData.name}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {userData.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {userData.isVerified ? (
                            <div className="flex items-center gap-1 text-green-400 text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-yellow-400 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Unverified
                            </div>
                          )}
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400 text-xs">
                            Joined{" "}
                            {new Date(
                              userData.createdAt || "",
                            ).toLocaleDateString()}
                          </span>
                          {userData.isPremium && (
                            <>
                              <span className="text-gray-500">•</span>
                              <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                <Crown className="w-3 h-3" />
                                {userData.planType || "premium"}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          userData.role === "admin"
                            ? "bg-purple-600/20 text-purple-400 border border-purple-600/50"
                            : "bg-blue-600/20 text-blue-400 border border-blue-600/50"
                        }`}
                      >
                        {userData.role}
                      </span>

                      {userData.id !== user.id && (
                        <>
                          {userData.isPremium &&
                            userData.stripeSubscriptionId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleCancelSubscription(userData.id)
                                }
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                title="Cancel subscription"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel Sub
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRoleChange(
                                userData.id,
                                userData.role === "admin" ? "user" : "admin",
                              )
                            }
                            className="text-gray-400 hover:text-white"
                          >
                            {userData.role === "admin" ? "Demote" : "Promote"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">
                Coupon Management
              </h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Create and manage promotional coupons for businesses.
            </p>
            <Button
              onClick={() => setShowCouponManagement(true)}
              className="bg-cherry-rose hover:bg-green-600 text-white"
            >
              <Tag className="w-4 h-4 mr-2" />
              Manage Coupons
            </Button>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Security Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-600/20 border border-green-600/50 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Security Features Enabled</span>
                </div>
                <ul className="text-green-300 text-sm mt-2 space-y-1">
                  <li>• JWT-based authentication</li>
                  <li>• Role-based access control</li>
                  <li>• Secure HTTP-only cookies</li>
                  <li>• Google OAuth 2.0</li>
                  <li>• Password hashing with bcrypt</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-600/20 border border-blue-600/50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-400">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Database Security</span>
                </div>
                <ul className="text-blue-300 text-sm mt-2 space-y-1">
                  <li>• SQLite with encrypted data</li>
                  <li>• Session management</li>
                  <li>• Environment-based secrets</li>
                  <li>• Prepared statements</li>
                  <li>• Input validation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Coupon Management Modal */}
      <CouponManagement
        isOpen={showCouponManagement}
        onClose={() => setShowCouponManagement(false)}
        businesses={businesses}
      />
    </div>
  );
}
