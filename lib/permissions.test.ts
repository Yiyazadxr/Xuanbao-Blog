import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissions,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PERMISSIONS,
} from "@/lib/permissions";
import { ROLES } from "@/lib/roles";

describe("权限清单", () => {
  it("共 9 项权限且每项都有标签", () => {
    expect(ALL_PERMISSIONS).toHaveLength(9);
    for (const permission of ALL_PERMISSIONS) {
      expect(PERMISSION_LABELS[permission]).toBeTruthy();
    }
  });

  it("分组覆盖全部权限", () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) => group.permissions);
    expect(new Set(grouped)).toEqual(new Set(ALL_PERMISSIONS));
  });

  it("默认角色权限只引用已知权限", () => {
    for (const list of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
      for (const permission of list) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
    }
    // 超级管理员固定全开
    expect(DEFAULT_ROLE_PERMISSIONS[ROLES.SUPER_ADMIN]).toEqual(ALL_PERMISSIONS);
  });
});

describe("normalizePermissions", () => {
  it("保留合法权限并去重", () => {
    expect(
      normalizePermissions([
        PERMISSIONS.COMMENT,
        PERMISSIONS.LIKE,
        PERMISSIONS.COMMENT,
      ])
    ).toEqual([PERMISSIONS.COMMENT, PERMISSIONS.LIKE]);
  });

  it("保留合法空数组以表达零权限", () => {
    expect(normalizePermissions([])).toEqual([]);
  });

  it("过滤非法权限值", () => {
    expect(normalizePermissions([PERMISSIONS.COMMENT, "unknown", null, 1])).toEqual([
      PERMISSIONS.COMMENT,
    ]);
  });

  it("全部为非法值时视为损坏配置", () => {
    expect(normalizePermissions(["unknown", null, 1])).toBeNull();
  });

  it("非数组配置视为损坏", () => {
    expect(normalizePermissions("comment")).toBeNull();
    expect(normalizePermissions(null)).toBeNull();
  });
});
