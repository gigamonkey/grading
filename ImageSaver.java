import com.gigamonkeys.bhs.graphics.ImageGenerator;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

public class ImageSaver {

  static class PathClassLoader extends ClassLoader {

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

  public static boolean compile(Path file) throws IOException {
    JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
    DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();

    try (StandardJavaFileManager fileManager =
        compiler.getStandardFileManager(diagnostics, null, null)) {

      Iterable<? extends JavaFileObject> compilationUnits =
          fileManager.getJavaFileObjectsFromPaths(List.of(file));
      JavaCompiler.CompilationTask task =
          compiler.getTask(null, fileManager, diagnostics, null, null, compilationUnits);

      if (task.call()) {
        return true;
      } else {
        return false;
        // System.out.println("Compilation failed.");
        // for (Diagnostic<? extends JavaFileObject> diagnostic : diagnostics.getDiagnostics()) {
        //   System.out.format("Error on line %d in %s%n", diagnostic.getLineNumber(),
        // diagnostic.getSource().toUri());
        // }
      }
    }
  }

  static class Generator {
    private final Path dir;
    private ImageGenerator imageGenerator = null;

    Generator(Path dir) {
      this.dir = dir;
    }

    Path dir() {
      return dir;
    }

    // Do this lazily so we can recompile the Java file first if needed.
    ImageGenerator imageGenerator() {
      if (imageGenerator == null) {
        try {
          Class<?> clazz = new PathClassLoader(dir).loadClass("Flag");
          try {
            imageGenerator = (ImageGenerator) clazz.getDeclaredConstructor().newInstance();
          } catch (ClassCastException cce) {
            throw new RuntimeException("Class not an ImageGenerator");
          }
        } catch (ReflectiveOperationException roe) {
          throw new RuntimeException(roe);
        }
      }
      return imageGenerator;
    }

    Path javaFile() {
      return dir.resolve("Flag.java");
    }

    Path classFile() {
      return dir.resolve("Flag.class");
    }

    Path imageFile(String name) {
      return dir.resolve(name + ".png");
    }

    boolean maybeCompile() throws IOException {
      boolean ok = true;
      if (needsRebuild(javaFile(), classFile())) {
        System.out.print(javaFile() + ": compiling ... ");
        ok = compile(javaFile());
        System.out.println(ok ? "ok." : " failed.");
      } else {
        // System.out.println(classFile() + " up to date.");
      }
      return ok;
    }

    void maybeSave(String name, int w, int h) throws IOException {
      Path img = imageFile(name);
      if (needsRebuild(classFile(), img)) {
        save(img, w, h);
      } else {
        // System.out.println(img + ": up to date");
      }
    }

    boolean needsRebuild(Path source, Path output) throws IOException {
      if (!Files.exists(output)) {
        return true;
      } else {
        var sourceMod = Files.getLastModifiedTime(source);
        var outputMod = Files.getLastModifiedTime(output);
        return sourceMod.compareTo(outputMod) > 0;
      }
    }

    void save(Path p, int w, int h) throws IOException {
      System.out.print(p + ": regenerating ... ");
      try {
        var image = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        imageGenerator().draw(image.createGraphics(), w, h);
        ImageIO.write(image, "png", Files.newOutputStream(p));
        System.out.println("ok.");
      } catch (RuntimeException cnfe) {
        System.out.println("failed.");
      }
    }
  }

  public static Stream<Path> dirs(String root) throws IOException {
    var matcher = FileSystems.getDefault().getPathMatcher("glob:**/Flag.java");
    return Files.walk(Path.of(root))
        .filter(Files::isRegularFile)
        .filter(matcher::matches)
        .map(Path::getParent);
  }

  public static void main(String[] args) throws Exception {
    var gens = dirs(args[0]).map(Generator::new).collect(Collectors.toList());

    for (var g : gens) {
      try {
        if (g.maybeCompile()) {
          g.maybeSave("Portrait", 3000, 5000);
          g.maybeSave("Landscape", 5000, 3000);
          g.maybeSave("Square", 3000, 3000);
          g.maybeSave("Skinny", 3000, 1000);
          g.maybeSave("Medium", 800, 400);
          g.maybeSave("Small", 150, 75);
        }
      } catch (Exception e) {
        System.err.println(g.dir() + ": problem generating images.");
        e.printStackTrace();
      }
    }
  }
}
