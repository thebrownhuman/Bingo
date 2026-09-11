import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { ProgressBarModule } from '@progress/kendo-angular-progressbar';

type Selection = { kind: 'tray'; number: number } | { kind: 'cell'; index: number } | null;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

@Component({
  selector: 'app-board-setup',
  standalone: true,
  imports: [CommonModule, LayoutModule, ButtonsModule, ProgressBarModule],
  templateUrl: './board-setup.component.html',
})
export class BoardSetupComponent {
  @Input() readyCount = 0;
  @Input() totalPlayers = 0;
  @Output() ready = new EventEmitter<(number | null)[]>();

  cells = signal<(number | null)[]>(Array.from({ length: 25 }, () => null));
  tray = signal<number[]>(Array.from({ length: 25 }, (_, i) => i + 1));
  selection = signal<Selection>(null);

  get isFull(): boolean {
    return this.cells().every((c) => c !== null);
  }

  isCellSelected(index: number): boolean {
    const s = this.selection();
    return s?.kind === 'cell' && s.index === index;
  }

  isTraySelected(number: number): boolean {
    const s = this.selection();
    return s?.kind === 'tray' && s.number === number;
  }

  randomize(): void {
    this.cells.set(shuffle(Array.from({ length: 25 }, (_, i) => i + 1)));
    this.tray.set([]);
    this.selection.set(null);
  }

  selectTray(number: number): void {
    const current = this.selection();
    if (current?.kind === 'tray' && current.number === number) {
      this.selection.set(null);
      return;
    }
    this.selection.set({ kind: 'tray', number });
  }

  selectCell(index: number): void {
    const current = this.selection();
    const cellValue = this.cells()[index];

    if (!current) {
      if (cellValue !== null) this.selection.set({ kind: 'cell', index });
      return;
    }

    if (current.kind === 'tray') {
      this.placeFromTray(current.number, index);
      return;
    }

    if (current.kind === 'cell') {
      if (current.index === index) {
        this.selection.set(null);
        return;
      }
      this.swapCells(current.index, index);
    }
  }

  private placeFromTray(number: number, targetIndex: number): void {
    const cells = [...this.cells()];
    const bumped = cells[targetIndex];
    cells[targetIndex] = number;
    this.cells.set(cells);

    const tray = this.tray().filter((n) => n !== number);
    if (bumped !== null) tray.push(bumped);
    this.tray.set(tray);
    this.selection.set(null);
  }

  private swapCells(a: number, b: number): void {
    const cells = [...this.cells()];
    [cells[a], cells[b]] = [cells[b], cells[a]];
    this.cells.set(cells);
    this.selection.set(null);
  }

  returnToTray(index: number): void {
    const cells = [...this.cells()];
    const value = cells[index];
    if (value === null) return;
    cells[index] = null;
    this.cells.set(cells);
    this.tray.set([...this.tray(), value]);
    this.selection.set(null);
  }

  confirmReady(): void {
    if (!this.isFull) return;
    this.ready.emit(this.cells());
  }
}
