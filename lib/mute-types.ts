// 禁言相关类型，客户端与服务端共用。
export type MuteInfo = {
  muted: boolean;
  permanent: boolean;
  until: string | null; // 定时解禁时间（ISO 字符串），永久禁言为 null
  reason: string | null;
};
