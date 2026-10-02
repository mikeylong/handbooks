#!/usr/bin/env swift
import AppKit
import Foundation
import PDFKit

func argument(_ name: String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of: name), index + 1 < CommandLine.arguments.count else {
        return nil
    }
    return CommandLine.arguments[index + 1]
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

func isSymbolicLink(_ url: URL) -> Bool {
    return (try? url.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == true
}

guard let pdfArgument = argument("--pdf"), let outputArgument = argument("--output-dir") else {
    fail("Usage: render-pdfkit.swift --pdf <file.pdf> --output-dir <directory> [--dpi <72-600>]")
}

let dpi = Double(argument("--dpi") ?? "144") ?? 144
guard dpi >= 72 && dpi <= 600 else {
    fail("--dpi must be between 72 and 600")
}

let fileManager = FileManager.default
let lexicalPDF = URL(fileURLWithPath: NSString(string: pdfArgument).expandingTildeInPath)
let lexicalOutput = URL(fileURLWithPath: NSString(string: outputArgument).expandingTildeInPath, isDirectory: true)
guard !isSymbolicLink(lexicalPDF) else { fail("PDF cannot be a symlink") }
guard !isSymbolicLink(lexicalOutput) else { fail("Output directory cannot be a symlink") }

let pdfURL = lexicalPDF.standardizedFileURL
let outputURL = lexicalOutput.standardizedFileURL
guard let document = PDFDocument(url: pdfURL) else { fail("Unable to open PDF") }
try? fileManager.createDirectory(at: outputURL, withIntermediateDirectories: true)

if let existing = try? fileManager.contentsOfDirectory(at: outputURL, includingPropertiesForKeys: [.isSymbolicLinkKey]) {
    for url in existing where url.lastPathComponent.hasPrefix("page-") && url.pathExtension.lowercased() == "png" {
        guard !isSymbolicLink(url) else { fail("Refusing to replace a symlinked proof image") }
        try? fileManager.removeItem(at: url)
    }
}

for index in 0..<document.pageCount {
    guard let page = document.page(at: index) else { fail("Missing PDF page \(index + 1)") }
    let bounds = page.bounds(for: .mediaBox)
    let size = NSSize(width: bounds.width * dpi / 72.0, height: bounds.height * dpi / 72.0)
    let image = page.thumbnail(of: size, for: .mediaBox)
    guard let data = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: data),
          let png = bitmap.representation(using: .png, properties: [:]) else {
        fail("Unable to encode PDF page \(index + 1)")
    }
    let name = String(format: "page-%03d.png", index + 1)
    try png.write(to: outputURL.appendingPathComponent(name), options: .atomic)
}

let report: [String: Any] = [
    "schemaVersion": 1,
    "status": "passed",
    "renderer": "Apple PDFKit",
    "pdf": pdfURL.lastPathComponent,
    "pages": document.pageCount,
    "dpi": Int(dpi),
    "outputDirectory": outputURL.lastPathComponent
]
let reportData = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(reportData)
FileHandle.standardOutput.write(Data("\n".utf8))
