'use client'

import Link from 'next/link'
import { Github, Twitter, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-casino-500 to-casino-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🎰</span>
              </div>
              <span className="text-xl font-bold text-gradient">Casino Bot</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              The ultimate Discord casino bot with games, crypto trading, social features, 
              and endless entertainment for your server.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/commands" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Commands
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/store" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Store
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://discord.gg/your-support-server"
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  Discord Server
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 flex items-center justify-center">
            Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> by KayX
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2024 Casino Bot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}