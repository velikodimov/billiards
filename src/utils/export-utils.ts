import { Table } from "../model/table"

export interface ShotSnapshot {
  init: string
  shot: string
}

export class ExportUtils {
  static captureSnapshot(table: Table): ShotSnapshot {
    const init = JSON.stringify(table.shortSerialise())
    const shot = ExportUtils.encodeShot(table.cue!.aim)
    return { init, shot }
  }

  /** initShot-param encoding of an aim (AimEvent or compatible). */
  static encodeShot(aim: {
    i: number
    angle: number
    power: number
    offset: { x: number; y: number }
    elevation?: number
  }): string {
    return JSON.stringify({
      cueBallId: aim.i,
      angle: aim.angle,
      power: aim.power,
      offset: { x: aim.offset.x, y: aim.offset.y },
      elevation: aim.elevation || 0,
    })
  }

  static getExportUrl(
    isAnalysis: boolean,
    rulename: string,
    init: string,
    shot: string,
    tableSize?: number
  ): string {
    const base = isAnalysis
      ? "https://velikodimov.github.io/billiards/dist/index.html"
      : "diagrams/export.html"
    const params = new URLSearchParams()
    params.set("ruletype", rulename)
    if (isAnalysis) {
      params.set("practice", "")
      params.set("analysis", "")
    }
    params.set("init", init)
    params.set("initShot", shot)
    if (tableSize !== undefined && tableSize !== 10) {
      params.set("tableSize", String(tableSize))
    }
    return `${base}?${params.toString()}`
  }

  /** Same-origin drill-mode link for a shot: drill and analysis are both
   * query-flag modes of index.html sharing the init/initShot encoding. */
  static getDrillUrl(
    rulename: string,
    init: string,
    shot: string,
    tableSize?: number
  ): string {
    const params = new URLSearchParams()
    params.set("ruletype", rulename)
    // Rack.fromInitParam only applies init when the literal practice param is
    // present (the container's practice default doesn't reach it).
    params.set("practice", "")
    params.set("drill", "")
    params.set("init", init)
    params.set("initShot", shot)
    if (tableSize !== undefined && tableSize !== 10) {
      params.set("tableSize", String(tableSize))
    }
    return `index.html?${params.toString()}`
  }
}
