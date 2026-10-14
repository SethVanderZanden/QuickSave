# Shift-only global detector for QuickSave.
# Prints DOWN/UP left|right and OTHER. Does not record other key names.
# A native GetMessage loop keeps the low-level hook alive (WinForms Application.Run
# can return immediately and drop the hook).
$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::Out.AutoFlush = $true
[Console]::InputEncoding = $OutputEncoding

Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

public static class QuickSaveShiftHook {
  private const int WH_KEYBOARD_LL = 13;
  private const int WM_KEYDOWN = 0x0100;
  private const int WM_KEYUP = 0x0101;
  private const int WM_SYSKEYDOWN = 0x0104;
  private const int WM_SYSKEYUP = 0x0105;
  private const int VK_SHIFT = 0x10;
  private const int VK_LSHIFT = 0xA0;
  private const int VK_RSHIFT = 0xA1;
  private const int VK_CONTROL = 0x11;
  private const int VK_MENU = 0x12;
  private const int VK_C = 0x43;
  private const uint SCAN_LSHIFT = 0x2A;
  private const uint SCAN_RSHIFT = 0x36;
  private const uint LLKHF_UP = 0x80;
  private const uint LLKHF_INJECTED = 0x10;
  private const uint KEYEVENTF_KEYUP = 0x0002;

  private static IntPtr _hook = IntPtr.Zero;
  private static readonly LowLevelKeyboardProc _proc = HookProc;
  private static int _leftDown;
  private static int _rightDown;

  private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll", SetLastError = true)]
  private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

  [DllImport("user32.dll", SetLastError = true)]
  private static extern bool UnhookWindowsHookEx(IntPtr hhk);

  [DllImport("user32.dll")]
  private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

  [DllImport("kernel32.dll", CharSet = CharSet.Auto)]
  private static extern IntPtr GetModuleHandle(string lpModuleName);

  [DllImport("user32.dll")]
  private static extern int GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

  [DllImport("user32.dll")]
  private static extern bool TranslateMessage(ref MSG lpMsg);

  [DllImport("user32.dll")]
  private static extern IntPtr DispatchMessage(ref MSG lpMsg);

  [DllImport("user32.dll")]
  private static extern void PostQuitMessage(int nExitCode);

  [DllImport("user32.dll")]
  private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

  [StructLayout(LayoutKind.Sequential)]
  private struct KBDLLHOOKSTRUCT {
    public uint vkCode;
    public uint scanCode;
    public uint flags;
    public uint time;
    public UIntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct MSG {
    public IntPtr hwnd;
    public uint message;
    public UIntPtr wParam;
    public IntPtr lParam;
    public uint time;
    public int ptX;
    public int ptY;
  }

  public static void Run() {
    IntPtr hMod = IntPtr.Zero;
    try {
      using (Process cur = Process.GetCurrentProcess())
      using (ProcessModule mod = cur.MainModule) {
        hMod = GetModuleHandle(mod != null ? mod.ModuleName : null);
      }
    } catch {
      hMod = GetModuleHandle(null);
    }

    _hook = SetWindowsHookEx(WH_KEYBOARD_LL, _proc, hMod, 0);
    if (_hook == IntPtr.Zero) {
      Console.Error.WriteLine("ERROR SetWindowsHookEx " + Marshal.GetLastWin32Error());
      Console.Error.Flush();
      Environment.Exit(1);
    }

    AppDomain.CurrentDomain.ProcessExit += delegate { Teardown(); };
    Console.CancelKeyPress += delegate { Teardown(); };

    Thread stdin = new Thread(new ThreadStart(ReadCommands));
    stdin.IsBackground = true;
    stdin.Start();

    Console.WriteLine("READY");
    Console.Out.Flush();

    MSG msg;
    while (GetMessage(out msg, IntPtr.Zero, 0, 0) > 0) {
      TranslateMessage(ref msg);
      DispatchMessage(ref msg);
    }
    Teardown();
  }

  private static void ReadCommands() {
    string line;
    while ((line = Console.ReadLine()) != null) {
      string command = line.Trim();
      if (command.Equals("QUIT", StringComparison.OrdinalIgnoreCase)) {
        PostQuitMessage(0);
        break;
      }
      if (command.Equals("COPY", StringComparison.OrdinalIgnoreCase)) {
        SendCopy();
        Console.WriteLine("COPIED");
        Console.Out.Flush();
      }
    }
    PostQuitMessage(0);
  }

  private static void SendCopy() {
    keybd_event(unchecked((byte)VK_LSHIFT), unchecked((byte)SCAN_LSHIFT), KEYEVENTF_KEYUP, UIntPtr.Zero);
    keybd_event(unchecked((byte)VK_RSHIFT), unchecked((byte)SCAN_RSHIFT), KEYEVENTF_KEYUP, UIntPtr.Zero);
    keybd_event(unchecked((byte)VK_SHIFT), 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    keybd_event(unchecked((byte)VK_MENU), 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    Thread.Sleep(25);
    keybd_event(unchecked((byte)VK_CONTROL), 0, 0, UIntPtr.Zero);
    keybd_event(unchecked((byte)VK_C), 0x2E, 0, UIntPtr.Zero);
    keybd_event(unchecked((byte)VK_C), 0x2E, KEYEVENTF_KEYUP, UIntPtr.Zero);
    keybd_event(unchecked((byte)VK_CONTROL), 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
  }

  private static void Teardown() {
    if (_hook != IntPtr.Zero) {
      UnhookWindowsHookEx(_hook);
      _hook = IntPtr.Zero;
    }
  }

  private static IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam) {
    if (nCode >= 0) {
      KBDLLHOOKSTRUCT info = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));
      if ((info.flags & LLKHF_INJECTED) == 0) {
        int wp = wParam.ToInt32();
        bool isUp = wp == WM_KEYUP || wp == WM_SYSKEYUP || (info.flags & LLKHF_UP) != 0;
        bool isDown = wp == WM_KEYDOWN || wp == WM_SYSKEYDOWN;
        string side = ResolveSide(info.vkCode, info.scanCode);
        if (side == null) {
          if (isDown) Emit("OTHER");
        } else if (isUp) {
          if (side == "left") _leftDown = 0;
          else _rightDown = 0;
          Emit("UP " + side);
        } else if (isDown) {
          if (side == "left") {
            if (_leftDown == 0) {
              _leftDown = 1;
              Emit("DOWN left");
            }
          } else if (_rightDown == 0) {
            _rightDown = 1;
            Emit("DOWN right");
          }
        }
      }
    }
    return CallNextHookEx(_hook, nCode, wParam, lParam);
  }

  private static string ResolveSide(uint vkCode, uint scanCode) {
    if (vkCode == VK_LSHIFT) return "left";
    if (vkCode == VK_RSHIFT) return "right";
    if (scanCode == SCAN_RSHIFT) return "right";
    if (scanCode == SCAN_LSHIFT) return "left";
    if (vkCode == VK_SHIFT) return "left";
    return null;
  }

  private static void Emit(string line) {
    Console.WriteLine(line);
    Console.Out.Flush();
  }
}
"@

[QuickSaveShiftHook]::Run()
