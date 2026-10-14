# Shift-only global detector for QuickSave.
# Watches Left/Right Shift double-taps. Does not record other keys.
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

public static class QuickSaveShiftHook {
  private const int WH_KEYBOARD_LL = 13;
  private const int WM_KEYDOWN = 0x0100;
  private const int WM_SYSKEYDOWN = 0x0104;
  private const int VK_LSHIFT = 0xA0;
  private const int VK_RSHIFT = 0xA1;
  private const int LLKHF_EXTENDED = 0x01;
  private static IntPtr _hook = IntPtr.Zero;
  private static LowLevelKeyboardProc _proc = HookProc;
  private static long _lastLeft;
  private static long _lastRight;
  private static readonly long WindowMs = 400;

  private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll", SetLastError = true)]
  private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

  [DllImport("user32.dll", SetLastError = true)]
  private static extern bool UnhookWindowsHookEx(IntPtr hhk);

  [DllImport("user32.dll")]
  private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

  [DllImport("kernel32.dll")]
  private static extern IntPtr GetModuleHandle(string lpModuleName);

  [StructLayout(LayoutKind.Sequential)]
  private struct KBDLLHOOKSTRUCT {
    public uint vkCode;
    public uint scanCode;
    public uint flags;
    public uint time;
    public UIntPtr dwExtraInfo;
  }

  public static void Run() {
    using (Process cur = Process.GetCurrentProcess())
    using (ProcessModule mod = cur.MainModule) {
      _hook = SetWindowsHookEx(WH_KEYBOARD_LL, _proc, GetModuleHandle(mod.ModuleName), 0);
    }
    if (_hook == IntPtr.Zero) {
      Environment.Exit(1);
    }
    Console.WriteLine("READY");
    Console.Out.Flush();
    System.Windows.Forms.Application.Run();
  }

  private static IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam) {
    if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
      KBDLLHOOKSTRUCT info = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);
      if (info.vkCode == VK_LSHIFT || info.vkCode == VK_RSHIFT) {
        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (info.vkCode == VK_LSHIFT) {
          if (now - _lastLeft <= WindowMs) {
            Console.WriteLine("CAPTURE");
            Console.Out.Flush();
            _lastLeft = 0;
          } else {
            _lastLeft = now;
          }
        } else {
          if (now - _lastRight <= WindowMs) {
            Console.WriteLine("TOGGLE");
            Console.Out.Flush();
            _lastRight = 0;
          } else {
            _lastRight = now;
          }
        }
      }
    }
    return CallNextHookEx(_hook, nCode, wParam, lParam);
  }
}
"@ -ReferencedAssemblies System.Windows.Forms

[QuickSaveShiftHook]::Run()
