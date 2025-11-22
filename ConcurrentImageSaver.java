import module java.base;

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

import com.gigamonkeys.bhs.graphics.ImageGenerator;
import com.gigamonkeys.bhs.testing.TestRunner;

public class ConcurrentImageSaver {

  private static class Generator implements Callable<Path> {

    private final Path javaFile;
    private final Path dir;

    Generator(Path javaFile)  {
      this.javaFile = javaFile;
      this.dir = javaFile.getParent();
    }

    Path dir() { return dir; }

    @Override
    public Path call() throws Exception {
      var clazz = TestRunner.classFromPath(javaFile);
      var gen  = (ImageGenerator) clazz.getDeclaredConstructor().newInstance();
      save(gen, "Portrait", 3000, 5000);
      save(gen, "Landscape", 5000, 3000);
      save(gen, "Square", 3000, 3000);
      save(gen, "Skinny", 3000, 1000);
      save(gen, "Medium", 800, 400);
      save(gen, "Small", 150, 75);
      return dir;
    }

    private void save(ImageGenerator gen, String name, int w, int h) throws IOException {
      var image = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
      gen.draw(image.createGraphics(), w, h);
      ImageIO.write(image, "png", Files.newOutputStream(dir.resolve(name + ".png")));
    }
  }

  public static Stream<Path> sourceFiles(String root) throws IOException {
    var matcher = FileSystems.getDefault().getPathMatcher("glob:**/Flag.java");
    return Files.walk(Path.of(root))
      .filter(Files::isRegularFile)
      .filter(matcher::matches);
  }

  public static void main(String[] args) throws Exception {
    var gens = sourceFiles(args[0]).map(Generator::new).toList();
    var runner = new WithTimeouts<Path>(10, TimeUnit.SECONDS);
    var results = runner.run(gens);
    for (int i = 0; i < gens.size(); i++) {
      IO.println("%s: %s".formatted(results.get(i).emoji(), gens.get(i).dir()));
    }
  }
}
