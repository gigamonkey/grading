import module java.base;

public class PathClassLoader extends ClassLoader {

  private Path path;

  public PathClassLoader(Path path) {
    this.path = path;
  }

  @Override
  public Class<?> findClass(String name) throws ClassNotFoundException {
    try {
      byte[] bytes = Files.readAllBytes(path.resolve(name + ".class"));
      return defineClass(name, bytes, 0, bytes.length);
    } catch (IOException ioe) {
      throw new ClassNotFoundException("Can't find file", ioe);
    }
  }
}
