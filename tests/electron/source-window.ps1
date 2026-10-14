param(
  [Parameter(Mandatory = $true)]
  [string]$Text
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::Out.AutoFlush = $true

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class QSForeground {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$form = New-Object System.Windows.Forms.Form
$form.Text = "QuickSave Capture Source"
$form.Width = 520
$form.Height = 240
$form.TopMost = $true
$form.StartPosition = "Manual"
$form.Left = 520
$form.Top = 80

$box = New-Object System.Windows.Forms.TextBox
$box.Multiline = $true
$box.Dock = "Fill"
$box.Font = New-Object System.Drawing.Font("Consolas", 14)
$box.Text = $Text
$form.Controls.Add($box)

$form.Add_Shown({
  [QSForeground]::ShowWindow($form.Handle, 5) | Out-Null
  [QSForeground]::SetForegroundWindow($form.Handle) | Out-Null
  $form.Activate()
  $box.Focus()
  $box.SelectAll()
  [Console]::Out.WriteLine("SOURCE_READY")
  [Console]::Out.Flush()
})

[System.Windows.Forms.Application]::Run($form)
