import { Container } from "../container/container"
import { id } from "../utils/dom"

interface ShotEntry {
  icon: string
  label: string
  color: string
  replayUri: string
  hiScoreUri?: string
  score?: number
  isPot: boolean
  isBreak: boolean
}

export interface HighBreakEntry {
  score: number
  hiScoreUri: string
}

/** In drill mode the tray survives the same-tab drill ⇄ analysis jumps via
 * sessionStorage (per-tab: a new tab starts a fresh history). */
const STORAGE_KEY = "drillBallTray"

export class BallTray {
  container: Container
  entries: ShotEntry[] = []

  private readonly trayElement: HTMLElement | null
  private readonly listElement: HTMLElement | null
  private readonly leftBtn: HTMLElement | null
  private readonly rightBtn: HTMLElement | null
  private readonly persistEnabled: boolean

  constructor(container: Container) {
    this.container = container
    this.trayElement = id("ballTray")
    this.listElement = id("ballTrayList")
    this.leftBtn = id("trayLeft")
    this.rightBtn = id("trayRight")
    this.persistEnabled = new URLSearchParams(
      globalThis.location?.search ?? ""
    ).has("drill")

    const stop = (e: Event) => {
      if ((e.target as HTMLElement).closest("a")) {
        return
      }
      e.stopPropagation()
    }

    this.leftBtn?.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.scroll(-80)
    })
    this.rightBtn?.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.scroll(80)
    })

    this.trayElement?.addEventListener("click", stop)
    this.trayElement?.addEventListener("mousedown", stop)
    this.trayElement?.addEventListener("touchstart", stop)

    this.restore()
    this.updateVisibility()
  }

  private persist() {
    if (!this.persistEnabled) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries))
    } catch {
      // storage unavailable (private browsing, quota) — history just won't
      // survive navigation
    }
  }

  private restore() {
    if (!this.persistEnabled) return
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const entries = JSON.parse(stored)
      if (!Array.isArray(entries) || entries.length === 0) return
      this.entries = entries
      this.entries.forEach((entry) => this.renderEntry(entry))
    } catch {
      // malformed/unavailable — start with an empty tray
    }
  }

  addShot(isPartOfBreak: boolean, potCount: number, balls: any[], state: any) {
    const pots = potCount > 1 ? potCount - 1 : 0
    let color = "#ffffff"
    if (balls.length > 0) {
      const lastBall = balls[balls.length - 1]
      if (lastBall.ballmesh) {
        color = "#" + lastBall.ballmesh.color.getHexString()
      }
    }

    const icon = "⚈".repeat(pots) + (isPartOfBreak ? "⚈" : "⚆")
    const replayUri = this.container.linkFormatter.getReplayUri(state)

    let label = "Shot"
    if (potCount > 0) {
      label = `${potCount} pot${potCount > 1 ? "s" : ""}`
    }

    const entry: ShotEntry = {
      icon,
      label,
      color,
      replayUri,
      isPot: potCount > 0,
      isBreak: false,
    }

    this.entries.push(entry)
    this.renderEntry(entry)
    this.persist()
    this.updateVisibility()
  }

  addBreak(breakData: any, score: number) {
    if (score <= 1) {
      return
    }

    const replayUri = this.container.linkFormatter.getReplayUri(breakData)
    const entry: ShotEntry = {
      icon: `(${score})`,
      label: `break(${score})`,
      color: "#ffd700",
      replayUri,
      score,
      isPot: true,
      isBreak: true,
    }

    if (score >= 2) {
      entry.hiScoreUri = this.container.linkFormatter.getHiScoreUri(
        breakData,
        score
      )
    }

    this.entries.push(entry)
    this.renderEntry(entry)
    this.persist()
    this.updateVisibility()
  }

  addGame(gameData: any) {
    const replayUri = this.container.linkFormatter.getReplayUri(gameData)
    const entry: ShotEntry = {
      icon: "Ⓡ",
      label: "Whole Game",
      color: "#ffffff",
      replayUri,
      isPot: true,
      isBreak: false,
    }

    this.entries.push(entry)
    this.renderEntry(entry)
    this.persist()
    this.updateVisibility()
  }

  getTopBreaks(limit: number = 3): HighBreakEntry[] {
    return this.entries
      .filter(
        (entry): entry is ShotEntry & { score: number; hiScoreUri: string } =>
          entry.isBreak &&
          entry.score !== undefined &&
          entry.score > 1 &&
          typeof entry.hiScoreUri === "string"
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ score, hiScoreUri }) => ({ score, hiScoreUri }))
  }

  reset() {
    this.entries = []
    if (this.listElement) {
      this.listElement.innerHTML = ""
    }
    if (this.persistEnabled) {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // storage unavailable — nothing to clear
      }
    }
    this.updateVisibility()
  }

  private updateVisibility() {
    if (this.trayElement) {
      this.trayElement.style.display = this.entries.length > 0 ? "flex" : "none"
    }
  }

  private scroll(distance: number) {
    if (this.listElement) {
      this.listElement.scrollBy({ left: distance, behavior: "smooth" })
    }
  }

  private renderEntry(entry: ShotEntry) {
    if (!this.listElement) return

    const lastGroup = this.listElement.lastElementChild as HTMLElement
    const canAppendToGroup =
      lastGroup?.classList.contains("break-group") &&
      !lastGroup.querySelector(".miss")

    const hiScoreHtml = entry.hiScoreUri
      ? `<a href="${entry.hiScoreUri}" target="_blank" class="hi-score-pill" title="hi score">🏆</a>`
      : ""

    const ballHtml = `
      <a href="${entry.replayUri}" target="_blank" class="ball-item ${entry.isPot ? "pot" : "miss"}${entry.isBreak ? " break-score" : ""}"
         title="${entry.label}" style="color: ${entry.color}">
        ${entry.icon}
      </a>
      ${hiScoreHtml}
    `

    if (entry.isPot) {
      if (canAppendToGroup) {
        const div = document.createElement("div")
        div.innerHTML = ballHtml
        while (div.firstChild) {
          lastGroup.appendChild(div.firstChild)
        }
      } else {
        const newGroup = document.createElement("div")
        newGroup.className = "break-group"
        newGroup.innerHTML = ballHtml
        this.listElement.appendChild(newGroup)
      }
    } else {
      const div = document.createElement("div")
      div.innerHTML = ballHtml
      while (div.firstChild) {
        this.listElement.appendChild(div.firstChild)
      }
    }

    // Auto-scroll to end
    requestAnimationFrame(() => {
      if (this.listElement) {
        this.listElement.scrollLeft = this.listElement.scrollWidth
      }
    })
  }
}
