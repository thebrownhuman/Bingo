import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { ProgressBarModule } from '@progress/kendo-angular-progressbar';
import { DataMoveEvent, DragEndEvent, DragOverEvent, DragStartEvent, SortableModule } from '@progress/kendo-angular-sortable';

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomFullLayout(): number[] {
  return shuffle(Array.from({ length: 25 }, (_, i) => i + 1));
}

@Component({
  selector: 'app-board-setup',
  standalone: true,
  imports: [CommonModule, LayoutModule, ButtonsModule, ProgressBarModule, SortableModule],
  templateUrl: './board-setup.component.html',
})
export class BoardSetupComponent implements OnInit {
  @Input() readyCount = 0;
  @Input() totalPlayers = 0;
  /** Restores a previously-submitted board (e.g. after going back from "ready") instead of starting blank. */
  @Input() initialLayout: (number | null)[] | null = null;
  @Output() ready = new EventEmitter<(number | null)[]>();

  cells = signal<number[]>(randomFullLayout());
  /** Index currently being dragged, and the index it's hovering over — both get highlighted so the swap is unambiguous. */
  dragSourceIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  ngOnInit(): void {
    if (this.initialLayout?.every((n): n is number => n !== null)) {
      this.cells.set([...this.initialLayout]);
    }
  }

  randomize(): void {
    this.cells.set(randomFullLayout());
  }

  /**
   * Kendo's Sortable fires `dataMove` on every cell you pass over mid-drag
   * (not just the final drop) and its default behavior is a list-reorder —
   * shifting every item in between. Neither fits a swap-two-cells board, so
   * every one of these is cancelled; the actual swap happens once, in
   * `onDragEnd`, between the drag's start and end positions.
   */
  onDataMove(event: DataMoveEvent): void {
    event.preventDefault();
  }

  onDragStart(event: DragStartEvent): void {
    this.dragSourceIndex.set(event.index);
  }

  onDragOver(event: DragOverEvent): void {
    this.dragOverIndex.set(event.index);
  }

  onDragLeave(): void {
    this.dragOverIndex.set(null);
  }

  onDragEnd(event: DragEndEvent): void {
    const from = this.dragSourceIndex();
    const to = event.index;
    if (from !== null && to >= 0 && to !== from) {
      const cells = [...this.cells()];
      const temp = cells[from];
      cells[from] = cells[to];
      cells[to] = temp;
      this.cells.set(cells);
    }
    this.dragSourceIndex.set(null);
    this.dragOverIndex.set(null);
  }

  confirmReady(): void {
    this.ready.emit(this.cells());
  }

  /** Lets the button show its normal pressed/focus feedback briefly, then clears it, instead of it staying stuck until the next tap elsewhere. */
  blurAfterDelay(el: EventTarget | null, delay = 200): void {
    setTimeout(() => (el as HTMLElement)?.blur(), delay);
  }
}
