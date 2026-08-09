import { useEffect, useState } from "react";
import { seedUsers } from "../../data/seedData";
import { storage, STORAGE_KEYS } from "../../services/storageService";

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const stored = storage.get(
      STORAGE_KEYS.users,
      seedUsers
    );

    setUsers(stored);
  }, []);

  return (
    <div>

      <div className="flex justify-between mb-8">

        <div>
          <h1 className="text-3xl font-bold">
            Users
          </h1>

          <p className="text-gray-500">
            Manage users and RBAC roles.
          </p>
        </div>

        <button className="bg-[#14532d] text-white px-5 py-3 rounded-lg">
          + Add User
        </button>

      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">

        <table className="w-full">

          <thead className="bg-[#eef4ef]">

            <tr>
              <th className="text-left p-4">
                User
              </th>

              <th className="text-left p-4">
                Department
              </th>

              <th className="text-left p-4">
                Role
              </th>

              <th className="text-left p-4">
                Team
              </th>

              <th className="text-left p-4">
                Status
              </th>

              <th className="text-left p-4">
                Action
              </th>
            </tr>

          </thead>

          <tbody>

            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t"
              >

                <td className="p-4">
                  <p className="font-semibold">
                    {user.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {user.email}
                  </p>
                </td>

                <td className="p-4">
                  {user.department}
                </td>

                <td className="p-4">
                  <span className="bg-[#eef4ef] text-[#14532d] px-3 py-1 rounded-full text-sm">
                    {user.role}
                  </span>
                </td>

                <td className="p-4">
                  {user.team}
                </td>

                <td className="p-4">
                  {user.status}
                </td>

                <td className="p-4">
                  <button className="text-[#14532d] font-semibold">
                    Edit
                  </button>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}