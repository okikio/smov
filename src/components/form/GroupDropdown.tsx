import { t } from "i18next";
import React, { useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { UserIcon, UserIcons } from "@/components/UserIcon";

interface GroupDropdownProps {
  groups: string[];
  currentGroups: string[];
  onSelectGroups: (groups: string[]) => void;
  onCreateGroup: (group: string, icon: UserIcons) => void;
  onRemoveGroup: (groupToRemove?: string) => void;
}

const userIconList = Object.values(UserIcons);

function parseGroupString(group: string): { icon: UserIcons; name: string } {
  const match = group.match(/^\[([a-zA-Z0-9_]+)\](.*)$/);
  if (match) {
    const iconKey = match[1].toUpperCase() as keyof typeof UserIcons;
    const icon = UserIcons[iconKey] || userIconList[0];
    const name = match[2].trim();
    return { icon, name };
  }
  return { icon: userIconList[0], name: group };
}

export function GroupDropdown({
  groups,
  currentGroups,
  onSelectGroups,
  onCreateGroup,
  onRemoveGroup,
}: GroupDropdownProps) {
  const [open, setOpen] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<UserIcons>(userIconList[0]);

  const handleToggleGroup = (group: string) => {
    let newGroups;
    if (currentGroups.includes(group)) {
      newGroups = currentGroups.filter((g) => g !== group);
    } else {
      newGroups = [...currentGroups, group];
    }
    onSelectGroups(newGroups);
  };

  const handleCreate = (group: string, icon: UserIcons) => {
    const groupString = `[${icon}]${group}`;
    onCreateGroup(groupString, icon);
    setOpen(false);
    setShowInput(false);
    setNewGroup("");
    setSelectedIcon(userIconList[0]);
  };

  return (
    <div className="relative min-w-[200px]">
      <button
        type="button"
        className="w-full px-3 py-2 text-xs bg-gray-700/50 border border-gray-600 rounded-lg text-white flex justify-between items-center"
        onClick={() => setOpen((v) => !v)}
      >
        {currentGroups.length > 0 ? (
          <span className="flex flex-wrap gap-1 items-center">
            {currentGroups.map((group) => {
              const { icon, name } = parseGroupString(group);
              return (
                <span
                  key={group}
                  className="flex items-center gap-1 bg-purple-900/30 px-2 py-1 rounded text-purple-300 text-xs"
                >
                  <UserIcon icon={icon} className="inline-block w-4 h-4" />
                  {name}
                </span>
              );
            })}
          </span>
        ) : (
          <span className="text-white/70">
            {t("home.bookmarks.groups.dropdown.placeholderButton")}
          </span>
        )}
        <span className="ml-2 text-white/40">
          <Icon
            icon={open ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
            className="text-base"
          />
        </span>
      </button>
      {open && (
        <div className="absolute z-[150] mt-1 end-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 pb-3 text-sm">
          {groups.length === 0 && !showInput && (
            <div className="px-4 py-2 text-gray-400">
              {t("home.bookmarks.groups.dropdown.empty")}
            </div>
          )}
          {groups.map((group) => {
            const { icon, name } = parseGroupString(group);
            return (
              <label
                key={group}
                className="flex items-center gap-2 px-4 py-2 hover:bg-purple-700/30 rounded-md cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={currentGroups.includes(group)}
                  onChange={() => handleToggleGroup(group)}
                  className="accent-purple-400"
                />
                <span className="w-5 h-5 flex items-center justify-center ml-1">
                  <UserIcon
                    icon={icon}
                    className="inline-block w-full h-full"
                  />
                </span>
                {name}
              </label>
            );
          })}
          <div className="flex flex-col gap-2 px-4 py-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs min-w-0"
                placeholder="Group name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate(newGroup, selectedIcon);
                  if (e.key === "Escape") setShowInput(false);
                }}
                style={{ minWidth: 0 }}
              />
              <button
                type="button"
                className="text-purple-400 font-bold px-2 py-1 min-w-[2.5rem]"
                onClick={() => handleCreate(newGroup, selectedIcon)}
                disabled={!newGroup.trim()}
                style={{ flexShrink: 0 }}
              >
                {t("home.bookmarks.groups.dropdown.addButton")}
              </button>
            </div>
            {newGroup.trim().length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2 w-full justify-center">
                {userIconList.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    className={`rounded p-1 border-2 ${
                      selectedIcon === icon
                        ? "border-purple-400 bg-gray-700"
                        : "border-transparent hover:border-gray-500"
                    }`}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    <span className="w-5 h-5 flex items-center justify-center">
                      <UserIcon
                        icon={icon}
                        className={`w-full h-full ${selectedIcon === icon ? "text-purple-400" : ""}`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {currentGroups.length > 0 && (
            <div className="border-t border-gray-700 pt-2 px-4">
              <div className="text-xs text-red-400 mb-1">
                {t("home.bookmarks.groups.dropdown.removeFromGroup")}
              </div>
              <div className="flex flex-wrap gap-2">
                {currentGroups.map((group) => {
                  const { icon, name } = parseGroupString(group);
                  return (
                    <button
                      key={group}
                      type="button"
                      className="flex items-center gap-1 px-2 py-1 rounded bg-red-900/30 text-red-300 text-xs hover:bg-red-700/30"
                      onClick={() => onRemoveGroup(group)}
                    >
                      <UserIcon icon={icon} className="inline-block w-4 h-4" />
                      {name}
                      <span className="ml-1">&times;</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="ml-2 text-xs text-red-400 underline"
                  onClick={() => onRemoveGroup()}
                >
                  {t("home.bookmarks.groups.dropdown.removeAll")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
