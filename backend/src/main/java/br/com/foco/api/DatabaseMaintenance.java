package br.com.foco.api;

import org.springframework.stereotype.Component;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.concurrent.locks.Lock;

@Component
class DatabaseMaintenance {
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock(true);
    Lock read() { return lock.readLock(); }
    Lock write() { return lock.writeLock(); }
}
