Folia Linux 便携版说明
======================

此压缩包包含以下内容：

- `folia-major`：程序可执行文件
- `resources/linux/icon.png`：应用图标
- `resources/linux/folia-major.desktop`：桌面启动项模板

如何创建桌面启动项：

1. 将桌面模板复制到：
   `~/.local/share/applications/folia-major.desktop`

2. 修改复制后的文件，将以下占位符替换为实际路径：
   `__APP_PATH__`  -> `folia-major` 可执行文件的绝对路径
   `__ICON_PATH__` -> `resources/linux/icon.png` 的绝对路径

示例：
`Exec=/home/yourname/Apps/Folia/folia-major`
`Icon=/home/yourname/Apps/Folia/resources/linux/icon.png`

3. 如果您的桌面环境有要求，请将该 `.desktop` 文件标记为可信或可执行。

Linux 图形兼容性：

- 图形后端：Wayland 会话默认原生 Wayland（`--ozone-platform=wayland`），X11 会话默认 x11；`NIXOS_OZONE_WL=0` 强制走 x11（nix 打包），命令行自带的 `--ozone-platform=...` 优先级最高。AppImage 默认使用 `swiftshader`，普通运行默认使用系统图形路径。
- 如果启动后出现黑屏、透明度/模糊异常或 GPU 崩溃，可尝试：
  `FOLIA_LINUX_GRAPHICS_MODE=swiftshader ./folia-major`
- 如果仍不稳定，可使用最保守的软件渲染：
  `FOLIA_LINUX_GRAPHICS_MODE=software ./folia-major`
- `FOLIA_LINUX_GRAPHICS_MODE=system` 恢复系统路径。调试非标准 AppImage 运行时可设置 `ELECTRON_LINUX_PACKAGED_GRAPHICS=true`。
- WebGPU（显卡分析/智能动感模式的鼓点分离）与 Vulkan 特性（`electron/linuxVulkan.cjs`）：
  - 原生 Wayland：不需要 Vulkan 特性（WebGPU 走 Dawn 自己的 Vulkan 路径；开了反而会让合成器报 “'--ozone-platform=wayland' is not compatible with Vulkan”），应用在 Wayland 下不会开启它。
  - X11（含 XWayland）：Chromium 默认不开 Vulkan，WebGPU 会找不到适配器。应用检测到本机有硬件 Vulkan 驱动（ICD 清单；lavapipe/SwiftShader 等软件渲染器不算）时自动开启；手动控制：`FOLIA_LINUX_VULKAN=1` 强制开启（没有驱动清单也开），`FOLIA_LINUX_VULKAN=0` 强制关闭；除 0/1 外的值按未设置处理（自动）。壁纸模式包装会话在系统图形路径下始终需要 Vulkan，不受该变量影响。
- NixOS 注意：NVIDIA 的 Vulkan 驱动清单在 `/run/opengl-driver/share/vulkan/icd.d/`，Chromium 的 GPU 进程沙箱读不到它，所以无论 Wayland 还是 x11，WebGPU 都找不到适配器（Chromium 上游问题：GPU 沙箱阻止读取 ICD 清单）。绕过方式三选一，都会关闭整个浏览器沙箱（含渲染进程），请自行权衡安全取舍：
  1. 「设置 → 动画与性能」打开「关闭浏览器沙箱」，重启 Folia 生效（推荐）；
  2. 环境变量 `FOLIA_LINUX_NO_SANDBOX=1`（`=0` 可强制保持开启沙箱，优先于设置开关）；
  3. 启动参数 `--no-sandbox`。
  2026-11-21 在 NixOS 26.11 + Electron 45 验证（RTX 4060 Ti）：关闭沙箱后性能检测约 20 倍实时分析，原生 Wayland 与 x11 均通过。

这些变量只影响 Electron Linux 启动参数，不改变 Web 端或同步服务配置。排查时先确认可执行文件和 `resources/` 位于同一便携包目录。

壁纸模式（桌面歌词壁纸）：

- 在“选项 → 桌面端”中开启“壁纸模式”，将整个窗口沉到所有正常窗口之下，作为桌面歌词壁纸。
- 需要 Wayland 合成器支持 `wlr-layer-shell` 协议（GNOME 不支持）。切换开关后应用会自动重启。
- Wayland（如 niri、KWin、Hyprland）下通过 `resources/windowtolayer` 将窗口包装为 `wlr-layer-shell` 的 bottom 层表面；X11 下主窗口变成桌面窗口（`_NET_WM_WINDOW_TYPE_DESKTOP`）。
