import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { proposalHtml } from './document'
import type { ProposalData } from './model'

export async function proposalPdf(data: ProposalData, number: string) {
  const logo = await readFile(path.join(process.cwd(), 'public/agencia/distinto-horizontal.svg'))
  return renderProposalPdf(proposalHtml(data, number, `data:image/svg+xml;base64,${logo.toString('base64')}`))
}

export async function renderProposalPdf(html: string) {
  chromium.setGraphicsMode = false
  const browser = await puppeteer.launch({
    args: chromium.args, headless: true,
    executablePath: process.env.VERCEL
      ? await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v138.0.0/chromium-v138.0.0-pack.x64.tar')
      : process.env.CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', request => request.url().startsWith('data:') || request.url() === 'about:blank' ? request.continue() : request.abort())
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 })
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: '<div style="font:9px Arial;width:100%;text-align:center;color:#aaa"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' })
  } finally { await browser.close() }
}
